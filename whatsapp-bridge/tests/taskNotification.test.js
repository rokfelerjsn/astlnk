import assert from "node:assert/strict";
import { test } from "node:test";
import { demoTicket, resetDemoTickets } from "../src/data/demoTickets.js";
import {
  completionButton,
  formatDoneMessage,
  formatTaskMessage,
  prepareTaskImageHeader,
  resolvePhotoPath,
  sendCompletionPrompt,
  sendTaskImage,
  sendTaskNotification,
  taskButtons,
} from "../src/messages/taskNotification.js";

function createSock() {
  const sentMessages = [];
  const relayedMessages = [];

  return {
    sentMessages,
    relayedMessages,
    authState: { creds: { me: { id: "bot@s.whatsapp.net" } } },
    user: { id: "bot@s.whatsapp.net" },
    logger: {
      debug() {},
      info() {},
      warn() {},
      error() {},
    },
    waUploadToServer: async () => ({
      mediaUrl: "https://example.invalid/image.enc",
      directPath: "/v/t62.7118-test",
    }),
    sendMessage: async (jid, payload) => {
      sentMessages.push({ jid, payload });
    },
    relayMessage: async (jid, message, options) => {
      relayedMessages.push({ jid, message, options });
    },
  };
}

function buttonParams(relay) {
  return relay.message.interactiveMessage.nativeFlowMessage.buttons.map((button) =>
    JSON.parse(button.buttonParamsJson)
  );
}

async function withSilentConsole(callback) {
  const originalLog = console.log;
  console.log = () => {};

  try {
    await callback();
  } finally {
    console.log = originalLog;
  }
}

test("formatTaskMessage mengikuti struktur notifikasi tugas AsetLink", () => {
  resetDemoTickets();

  assert.equal(
    formatTaskMessage(demoTicket()),
    `*Tugas Baru!*

Kerusakan: *Kelistrikan (Lampu / Stop Kontak)*
Lokasi: Gedung D / R.382
Pelapor: Mahasiswa (081234567890)
Deskripsi: Lampu ruangan tidak menyala

Tiket: #TK-75777
Waktu Lapor: 02 Jun 2026, 07:20`
  );
});

test("formatDoneMessage mengikuti struktur pesan selesai Telegram AsetLink", () => {
  resetDemoTickets();
  const ticket = demoTicket();
  ticket.resolvedAt = "02 Jun 2026, 07:27";

  assert.equal(
    formatDoneMessage(ticket),
    `*Tiket Selesai*

Tiket: #TK-75777
Kerusakan: Kelistrikan (Lampu / Stop Kontak)
Lokasi: Gedung D / R.382
Diselesaikan oleh: Pak Budi
Waktu: 02 Jun 2026, 07:27

Terima kasih atas kerja kerasnya.`
  );
});

test("taskButtons memakai callback id dikerjakan dan selesai seperti AsetLink", () => {
  resetDemoTickets();

  assert.deepEqual(taskButtons(demoTicket()), [
    { id: "dikerjakan_75777", text: "Mulai Kerjakan" },
    { id: "selesai_75777", text: "Tandai Selesai" },
  ]);
  assert.deepEqual(completionButton(demoTicket()), [
    { id: "selesai_75777", text: "Tandai Selesai" },
  ]);
});

test("resolvePhotoPath menemukan foto bukti tiket demo", () => {
  resetDemoTickets();

  const photoPath = resolvePhotoPath(demoTicket().photoPath);

  assert.equal(typeof photoPath, "string");
  assert.ok(photoPath.endsWith("assets\\TK-75777_1780384661.jpg") || photoPath.endsWith("assets/TK-75777_1780384661.jpg"));
});

test("sendTaskImage mengirim foto bukti dengan caption tugas", async () => {
  resetDemoTickets();
  const sock = createSock();

  await sendTaskImage(sock, "6281234567890@s.whatsapp.net", demoTicket());

  assert.equal(sock.sentMessages.length, 1);
  assert.equal(sock.sentMessages[0].jid, "6281234567890@s.whatsapp.net");
  assert.ok(Buffer.isBuffer(sock.sentMessages[0].payload.image));
  assert.equal(sock.sentMessages[0].payload.caption, formatTaskMessage(demoTicket()));
});

test("prepareTaskImageHeader membuat imageMessage untuk header interaktif", async () => {
  resetDemoTickets();
  const sock = createSock();

  const imageMessage = await prepareTaskImageHeader(sock, demoTicket());

  assert.equal(typeof imageMessage.url, "string");
  assert.equal(imageMessage.mimetype, "image/jpeg");
  assert.ok(imageMessage.jpegThumbnail);
});

test("sendTaskNotification mengirim image dan tombol dalam satu interactive bubble", async () => {
  await withSilentConsole(async () => {
    resetDemoTickets();
    const sock = createSock();

    await sendTaskNotification(sock, "6281234567890@s.whatsapp.net", demoTicket());

    assert.equal(sock.sentMessages.length, 0);
    assert.equal(sock.relayedMessages.length, 1);

    const relay = sock.relayedMessages[0];
    const interactiveMessage = relay.message.interactiveMessage;

    assert.equal(relay.jid, "6281234567890@s.whatsapp.net");
    assert.equal(interactiveMessage.header.title, "Tugas Baru AsetLink");
    assert.equal(interactiveMessage.header.hasMediaAttachment, true);
    assert.equal(interactiveMessage.header.imageMessage.mimetype, "image/jpeg");
    assert.equal(interactiveMessage.footer.text, "AsetLink SMART System");
    assert.match(interactiveMessage.body.text, /\*Tugas Baru!\*/);
    assert.deepEqual(buttonParams(relay), [
      { display_text: "Mulai Kerjakan", id: "dikerjakan_75777" },
      { display_text: "Tandai Selesai", id: "selesai_75777" },
    ]);
    assert.deepEqual(
      relay.options.additionalNodes.map((node) => node.tag),
      ["biz", "bot"]
    );
  });
});

test("sendCompletionPrompt hanya mengirim tombol Tandai Selesai", async () => {
  await withSilentConsole(async () => {
    resetDemoTickets();
    const sock = createSock();
    const ticket = demoTicket();
    ticket.status = "Dikerjakan";

    await sendCompletionPrompt(sock, "6281234567890@s.whatsapp.net", ticket);

    assert.equal(sock.relayedMessages.length, 1);
    assert.equal(
      sock.relayedMessages[0].message.interactiveMessage.header.title,
      "Tugas Dikerjakan"
    );
    assert.deepEqual(buttonParams(sock.relayedMessages[0]), [
      { display_text: "Tandai Selesai", id: "selesai_75777" },
    ]);
  });
});

test("sendCompletionPrompt membaca ticket_code dari payload Laravel", async () => {
  await withSilentConsole(async () => {
    const sock = createSock();

    await sendCompletionPrompt(sock, "6281234567890@s.whatsapp.net", {
      id: 42,
      ticket_code: "TK-90153",
    });

    const interactiveMessage = sock.relayedMessages[0].message.interactiveMessage;

    assert.match(interactiveMessage.body.text, /Tiket: #TK-90153/);
    assert.deepEqual(buttonParams(sock.relayedMessages[0]), [
      { display_text: "Tandai Selesai", id: "selesai_42" },
    ]);
  });
});
