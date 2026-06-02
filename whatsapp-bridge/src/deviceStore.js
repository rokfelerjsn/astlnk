import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STORAGE_DIR = path.resolve(ROOT_DIR, "storage");
const STORE_PATH = path.join(STORAGE_DIR, "devices.json");

function ensureStore() {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });

  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify({ devices: [] }, null, 2));
  }
}

function readStore() {
  ensureStore();

  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    return Array.isArray(parsed.devices) ? parsed : { devices: [] };
  } catch {
    return { devices: [] };
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

export function listDevices() {
  return readStore().devices;
}

export function getDevice(id) {
  return listDevices().find((device) => String(device.id) === String(id)) || null;
}

export function createDevice(input = {}) {
  const store = readStore();
  const id = String(input.id || Date.now());
  const existing = store.devices.find((device) => String(device.id) === id);

  if (existing) {
    return updateDevice(id, input);
  }

  const device = {
    id,
    device_id: id,
    display_name: input.display_name || input.name || `Device ${id}`,
    phone_number: input.phone_number || null,
    provider: input.provider || "baileys",
    status: input.status || "disconnected",
    quality_rating: input.quality_rating || "unknown",
    last_seen_at: input.last_seen_at || null,
    connected_at: input.connected_at || null,
    metadata: input.metadata || {},
    qr: input.qr || null,
    expires_at: input.expires_at || null,
  };

  store.devices.push(device);
  writeStore(store);

  return device;
}

export function updateDevice(id, updates = {}) {
  const store = readStore();
  const index = store.devices.findIndex((device) => String(device.id) === String(id));

  if (index === -1) {
    return createDevice({ id, ...updates });
  }

  store.devices[index] = {
    ...store.devices[index],
    ...updates,
    id: String(id),
    device_id: String(id),
  };

  writeStore(store);

  return store.devices[index];
}

export function deleteDevice(id) {
  const store = readStore();
  store.devices = store.devices.filter((device) => String(device.id) !== String(id));
  writeStore(store);
}
