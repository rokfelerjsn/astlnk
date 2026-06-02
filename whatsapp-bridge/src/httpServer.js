import http from "http";
import { config } from "./config.js";
import { createDevice, deleteDevice, getDevice, listDevices, updateDevice } from "./deviceStore.js";
import { connectDevice, disconnectDevice, removeSessionFiles, restartDevice, sendCompletionPromptMessage, sendTaskMessage, sendTextMessage } from "./sessionManager.js";
import { technicianNumbers } from "./laravelClient.js";

async function readBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");

  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function authorized(req) {
  if (!config.apiKey) {
    return true;
  }

  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const bridgeKey = req.headers["x-bridge-key"];

  return bearer === config.apiKey || bridgeKey === config.apiKey;
}

async function guardedSend(payload, sender) {
  return sender(payload);
}

export function startHttpServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const pathname = url.pathname;

      if (pathname === "/healthz" && req.method === "GET") {
        sendJson(res, 200, { status: "ok", transport: "baileys" });
        return;
      }

      if (!authorized(req)) {
        sendJson(res, 401, { message: "Unauthorized" });
        return;
      }

      if (pathname === "/api/devices" && req.method === "GET") {
        sendJson(res, 200, { devices: listDevices() });
        return;
      }

      if (pathname === "/api/devices" && req.method === "POST") {
        const body = await readBody(req);
        const device = createDevice(body);
        sendJson(res, 201, { device });
        return;
      }

      const deviceMatch = pathname.match(/^\/api\/devices\/([^/]+)(?:\/([^/]+))?$/);

      if (deviceMatch) {
        const id = decodeURIComponent(deviceMatch[1]);
        const action = deviceMatch[2] || "";

        if (req.method === "PATCH" && !action) {
          const body = await readBody(req);
          sendJson(res, 200, { device: updateDevice(id, body) });
          return;
        }

        if (req.method === "DELETE" && !action) {
          await disconnectDevice(id);
          removeSessionFiles(id);
          deleteDevice(id);
          sendJson(res, 200, { message: "Device deleted" });
          return;
        }

        if (req.method === "POST" && action === "connect") {
          sendJson(res, 200, await connectDevice(id));
          return;
        }

        if (req.method === "POST" && action === "disconnect") {
          sendJson(res, 200, await disconnectDevice(id));
          return;
        }

        if (req.method === "POST" && action === "restart") {
          sendJson(res, 200, await restartDevice(id));
          return;
        }

        if (req.method === "GET" && !action) {
          const device = getDevice(id);
          sendJson(res, device ? 200 : 404, device || { message: "Device not found" });
          return;
        }
      }

      if (pathname === "/api/messages/task-notification" && req.method === "POST") {
        const body = await readBody(req);
        sendJson(res, 200, await guardedSend(body, sendTaskMessage));
        return;
      }

      if (pathname === "/api/messages/text" && req.method === "POST") {
        const body = await readBody(req);
        sendJson(res, 200, await guardedSend(body, sendTextMessage));
        return;
      }

      if (pathname === "/api/messages/completion-prompt" && req.method === "POST") {
        const body = await readBody(req);
        sendJson(res, 200, await guardedSend(body, sendCompletionPromptMessage));
        return;
      }

      if (pathname === "/api/technician-numbers" && req.method === "GET") {
        const registry = await technicianNumbers(true);
        sendJson(res, 200, { numbers: registry.rows });
        return;
      }

      sendJson(res, 404, { message: "Not found" });
    } catch (err) {
      sendJson(res, err.status || 500, { message: err.message || "Internal server error" });
    }
  });

  server.listen(config.port, config.host, () => {
    console.log(`[HTTP] WhatsApp bridge aktif di http://${config.host}:${config.port}`);
  });

  return server;
}
