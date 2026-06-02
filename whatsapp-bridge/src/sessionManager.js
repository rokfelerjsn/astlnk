import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers, makeCacheableSignalKeyStore } from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { createDevice, getDevice, listDevices, updateDevice } from "./deviceStore.js";
import { handleInboundMessage } from "./inboundHandler.js";
import { sendCompletionPrompt, sendTaskNotification } from "./messages/taskNotification.js";
import { toWhatsAppJid, normalizePhone } from "./phone.js";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sockets = new Map();
const connecting = new Map();
const savingCreds = new Map();
const sendQueues = new Map();
const messageStore = new Map();
const manualDisconnects = new Set();

function sessionDir(deviceId) {
  return path.resolve(ROOT_DIR, "storage", "sessions", String(deviceId));
}

function trackCredsSave(deviceId, saveCreds) {
  const id = String(deviceId);
  const pending = Promise.resolve()
    .then(() => saveCreds())
    .finally(() => {
      if (savingCreds.get(id) === pending) {
        savingCreds.delete(id);
      }
    });

  savingCreds.set(id, pending);
}

async function waitForCredsSave(deviceId) {
  const pending = savingCreds.get(String(deviceId));

  if (!pending) {
    return;
  }

  try {
    await pending;
  } catch {
  }

  await new Promise((resolve) => setTimeout(resolve, 500));
}

function messageKey(key) {
  if (!key?.remoteJid || !key?.id) {
    return null;
  }

  return `${key.remoteJid}:${key.id}`;
}

function rememberMessage(msg) {
  const key = messageKey(msg?.key);

  if (!key || !msg?.message) {
    return;
  }

  messageStore.set(key, msg.message);

  if (messageStore.size > 1000) {
    messageStore.delete(messageStore.keys().next().value);
  }
}

async function getStoredMessage(key) {
  const id = messageKey(key);

  return id ? messageStore.get(id) : undefined;
}

async function withSendLock(deviceId, task) {
  const id = String(deviceId);
  const previous = sendQueues.get(id) || Promise.resolve();
  const current = previous.catch(() => {}).then(task);

  sendQueues.set(id, current);

  try {
    return await current;
  } finally {
    if (sendQueues.get(id) === current) {
      sendQueues.delete(id);
    }
  }
}

function jidUser(jid) {
  return String(jid || "").split("@")[0].split(":")[0].replace(/\D+/g, "");
}

async function resetRecipientSignalSessions(deviceId, sock, jid) {
  if (!jid || jid === "status@broadcast" || jid.endsWith("@g.us")) {
    return;
  }

  const user = jidUser(jid);

  if (!user || user === ownPhone(sock)) {
    return;
  }

  const ids = new Set([`${user}.0`]);
  const dir = sessionDir(deviceId);

  try {
    for (const file of fs.readdirSync(dir)) {
      if (file.startsWith(`session-${user}.`) && file.endsWith(".json")) {
        ids.add(file.slice("session-".length, -".json".length));
      }
    }
  } catch {
  }

  await sock.authState.keys.set({
    session: Object.fromEntries([...ids].map((id) => [id, null])),
  });
}

export function removeSessionFiles(deviceId) {
  fs.rmSync(sessionDir(deviceId), { recursive: true, force: true });
}

function ownPhone(sock) {
  return normalizePhone(sock.user?.id || sock.authState?.creds?.me?.id || "");
}

function publicDevice(device) {
  return {
    ...device,
    device_id: device.device_id || device.id,
    transport: "baileys",
  };
}

async function waitForConnectState(deviceId) {
  const started = Date.now();

  while (Date.now() - started < 25000) {
    const device = getDevice(deviceId);

    if (device?.status === "connected" || device?.status === "qr_pending") {
      return publicDevice(device);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return publicDevice(getDevice(deviceId));
}

async function createSocket(deviceId) {
  const id = String(deviceId);

  fs.mkdirSync(sessionDir(id), { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir(id));
  const { version } = await fetchLatestBaileysVersion();
  const logger = pino({ level: "silent" });
  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    browser: Browsers.windows("Chrome"),
    getMessage: getStoredMessage,
  });

  sockets.set(id, sock);

  sock.ev.on("creds.update", async () => {
    trackCredsSave(id, saveCreds);
    await waitForCredsSave(id);
  });

  sock.ev.on("connection.update", async (update) => {
    if (sockets.get(id) !== sock) {
      return;
    }

    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      updateDevice(id, {
        status: "qr_pending",
        qr,
        expires_at: new Date(Date.now() + 90000).toISOString(),
        last_seen_at: new Date().toISOString(),
      });
    }

    if (connection === "open") {
      updateDevice(id, {
        status: "connected",
        phone_number: ownPhone(sock),
        qr: null,
        expires_at: null,
        connected_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        quality_rating: "good",
        metadata: {},
      });
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      const restartRequired = code === DisconnectReason.restartRequired || code === 515;
      const manual = manualDisconnects.has(id);
      sockets.delete(id);
      manualDisconnects.delete(id);

      await waitForCredsSave(id);

      if (manual) {
        updateDevice(id, {
          status: "disconnected",
          qr: null,
          expires_at: null,
          metadata: {
            last_disconnect_code: code || null,
            manual: true,
          },
        });

        return;
      }

      if (loggedOut) {
        removeSessionFiles(id);

        updateDevice(id, {
          status: "disconnected",
          qr: null,
          expires_at: null,
          metadata: {
            last_disconnect_code: code || null,
            logged_out: true,
          },
        });

        return;
      }

      updateDevice(id, {
        status: "error",
        qr: null,
        expires_at: null,
        metadata: {
          last_disconnect_code: code || null,
          restart_required: restartRequired,
        },
      });

      setTimeout(() => {
        connectDevice(id).catch((err) => console.error(`[DEVICE] ${id} ${err.message}`));
      }, restartRequired ? 2000 : 5000);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (sockets.get(id) !== sock) {
      return;
    }

    if (type !== "notify") {
      return;
    }

    for (const msg of messages) {
      if (msg.key?.fromMe || !msg.message) {
        continue;
      }

      rememberMessage(msg);

      try {
        await handleInboundMessage(msg, { deviceId: id });
      } catch (err) {
        console.error(`[INBOUND] ${err.message}`);
      }
    }
  });

  return sock;
}

export async function connectDevice(deviceId) {
  const id = String(deviceId || config.defaultDeviceId);
  createDevice({ id });

  if (sockets.has(id)) {
    return publicDevice(getDevice(id));
  }

  if (!connecting.has(id)) {
    connecting.set(id, createSocket(id).finally(() => connecting.delete(id)));
  }

  await connecting.get(id);

  return waitForConnectState(id);
}

export async function disconnectDevice(deviceId) {
  const id = String(deviceId);
  const sock = sockets.get(id);

  if (sock) {
    manualDisconnects.add(id);

    try {
      sock.end(undefined);
    } catch {
    }
  }

  sockets.delete(id);
  await waitForCredsSave(id);

  return publicDevice(updateDevice(id, {
    status: "disconnected",
    qr: null,
    expires_at: null,
  }));
}

export async function restartDevice(deviceId) {
  await disconnectDevice(deviceId);

  return connectDevice(deviceId);
}

function resolveDeviceId(deviceId) {
  if (deviceId) {
    return String(deviceId);
  }

  const connected = listDevices().find((device) => device.status === "connected");

  if (connected) {
    return String(connected.id);
  }

  return String(config.defaultDeviceId);
}

async function connectedSocket(deviceId) {
  const id = resolveDeviceId(deviceId);
  let sock = sockets.get(id);

  if (!sock) {
    await connectDevice(id);
    sock = sockets.get(id);
  }

  const device = getDevice(id);

  if (!sock || device?.status !== "connected") {
    throw new Error("DEVICE_NOT_CONNECTED");
  }

  return { id, sock };
}

export async function sendTextMessage({ device_id, to, message }) {
  const { id, sock } = await connectedSocket(device_id);
  const result = await withSendLock(id, async () => {
    const jid = toWhatsAppJid(to);
    await resetRecipientSignalSessions(id, sock, jid);
    const sent = await sock.sendMessage(jid, { text: message });
    rememberMessage(sent);
    await waitForCredsSave(id);

    return sent;
  });

  updateDevice(id, { last_seen_at: new Date().toISOString() });

  return {
    status: "sent",
    device_id: id,
    message_id: result?.key?.id || null,
    key: result?.key || null,
  };
}

export async function sendTaskMessage({ device_id, to, ticket }) {
  const { id, sock } = await connectedSocket(device_id);
  const result = await withSendLock(id, async () => {
    const jid = toWhatsAppJid(to);
    await resetRecipientSignalSessions(id, sock, jid);
    const sent = await sendTaskNotification(sock, jid, ticket);
    rememberMessage(sent);
    await waitForCredsSave(id);

    return sent;
  });

  updateDevice(id, { last_seen_at: new Date().toISOString() });

  return {
    status: "sent",
    device_id: id,
    message_id: result?.key?.id || null,
    key: result?.key || null,
  };
}

export async function sendCompletionPromptMessage({ device_id, to, ticket }) {
  const { id, sock } = await connectedSocket(device_id);
  const result = await withSendLock(id, async () => {
    const jid = toWhatsAppJid(to);
    await resetRecipientSignalSessions(id, sock, jid);
    const sent = await sendCompletionPrompt(sock, jid, ticket);
    rememberMessage(sent);
    await waitForCredsSave(id);

    return sent;
  });

  updateDevice(id, { last_seen_at: new Date().toISOString() });

  return {
    status: "sent",
    device_id: id,
    message_id: result?.key?.id || null,
    key: result?.key || null,
  };
}

export async function startExistingDevices() {
  for (const device of listDevices()) {
    if (device.status === "connected" || device.status === "qr_pending") {
      connectDevice(device.id).catch((err) => console.error(`[DEVICE] ${device.id} ${err.message}`));
    }
  }
}
