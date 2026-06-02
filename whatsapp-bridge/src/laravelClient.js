import { config } from "./config.js";
import { normalizePhone } from "./phone.js";

let technicianCache = {
  expiresAt: 0,
  numbers: new Set(),
  rows: [],
};

function headers() {
  const result = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (config.laravelBridgeKey) {
    result.Authorization = `Bearer ${config.laravelBridgeKey}`;
    result["X-Bridge-Key"] = config.laravelBridgeKey;
  }

  return result;
}

async function request(pathname, options = {}) {
  const response = await fetch(`${config.laravelApiUrl}${pathname}`, {
    ...options,
    headers: {
      ...headers(),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(body.message || `LARAVEL_${response.status}`);
  }

  return body;
}

export async function technicianNumbers(force = false) {
  const now = Date.now();

  if (!force && technicianCache.expiresAt > now) {
    return technicianCache;
  }

  const body = await request("/internal/whatsapp/technician-numbers");
  const rows = Array.isArray(body.numbers) ? body.numbers : [];
  const numbers = new Set(
    rows
      .map((row) => normalizePhone(row.normalized_phone || row.phone))
      .filter(Boolean)
  );

  technicianCache = {
    expiresAt: now + 60000,
    numbers,
    rows,
  };

  return technicianCache;
}

export async function isTechnicianNumber(number) {
  const normalized = normalizePhone(number);

  if (!normalized) {
    return false;
  }

  const registry = await technicianNumbers();

  return registry.numbers.has(normalized);
}

export async function postInbound(payload) {
  return request("/webhook/whatsapp-custom", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
