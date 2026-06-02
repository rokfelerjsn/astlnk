export function normalizePhone(input) {
  if (!input) {
    return null;
  }

  const raw = String(input).split("@")[0].split(":")[0];
  const digits = raw.replace(/\D+/g, "");

  if (!digits) {
    return null;
  }

  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }

  if (digits.startsWith("8")) {
    return `62${digits}`;
  }

  return digits;
}

export function toWhatsAppJid(input) {
  if (!input) {
    throw new Error("INVALID_PHONE_NUMBER");
  }

  const value = String(input).trim();

  if (value.endsWith("@s.whatsapp.net") || value.endsWith("@lid")) {
    return value;
  }

  const normalized = normalizePhone(value);

  if (!normalized) {
    throw new Error("INVALID_PHONE_NUMBER");
  }

  return `${normalized}@s.whatsapp.net`;
}
