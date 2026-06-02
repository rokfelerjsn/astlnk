import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizePhone, toWhatsAppJid } from "../src/phone.js";

test("toWhatsAppJid mempertahankan JID WhatsApp asli untuk callback reply", () => {
  assert.equal(toWhatsAppJid("165146274091011@lid"), "165146274091011@lid");
  assert.equal(toWhatsAppJid("6281234567890@s.whatsapp.net"), "6281234567890@s.whatsapp.net");
});

test("toWhatsAppJid tetap membuat JID nomor biasa untuk notifikasi baru", () => {
  assert.equal(normalizePhone("081234567890"), "6281234567890");
  assert.equal(toWhatsAppJid("081234567890"), "6281234567890@s.whatsapp.net");
});
