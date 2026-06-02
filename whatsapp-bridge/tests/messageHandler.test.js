import assert from "node:assert/strict";
import { test } from "node:test";
import { resetDemoTickets } from "../src/data/demoTickets.js";
import {
  extractCallbackId,
  extractTextContent,
  handleMessage,
} from "../src/handlers/messageHandler.js";

function createMessage(message, remoteJid = "6281234567890@s.whatsapp.net") {
  return {
    key: { remoteJid },
    message,
  };
}

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
  const originalError = console.error;
  console.log = () => {};
  console.error = () => {};

  try {
    await callback();
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

test("extractCallbackId membaca semua bentuk callback WhatsApp untuk tombol AsetLink", () => {
  const cases = [
    [
      { buttonsResponseMessage: { selectedButtonId: "dikerjakan_75777" } },
      "dikerjakan_75777",
    ],
    [
      {
        listResponseMessage: {
          singleSelectReply: { selectedRowId: "selesai_75777" },
        },
      },
      "selesai_75777",
    ],
    [
      { templateButtonReplyMessage: { selectedId: "dikerjakan_75777" } },
      "dikerjakan_75777",
    ],
    [
      {
        interactiveResponseMessage: {
          nativeFlowResponseMessage: {
            paramsJson: JSON.stringify({ id: "selesai_75777" }),
          },
        },
      },
      "selesai_75777",
    ],
    [
      {
        interactiveResponseMessage: {
          nativeFlowResponseMessage: {
            paramsJson: JSON.stringify({ selected_id: "dikerjakan_75777" }),
          },
        },
      },
      "dikerjakan_75777",
    ],
    [
      {
        interactiveResponseMessage: {
          nativeFlowResponseMessage: {
            paramsJson: "{",
          },
        },
      },
      null,
    ],
  ];

  for (const [message, expected] of cases) {
    assert.equal(extractCallbackId(createMessage(message)), expected);
  }
});

test("extractTextContent membaca pesan teks dan caption media", () => {
  assert.equal(extractTextContent(createMessage({ conversation: "menu" })), "menu");
  assert.equal(
    extractTextContent(createMessage({ extendedTextMessage: { text: "/status" } })),
    "/status"
  );
  assert.equal(
    extractTextContent(createMessage({ imageMessage: { caption: "laporan" } })),
    "laporan"
  );
  assert.equal(extractTextContent(createMessage({})), "");
});

test("handleMessage mengirim notifikasi tugas AsetLink saat user mengetik menu", async () => {
  await withSilentConsole(async () => {
    resetDemoTickets();
    const sock = createSock();

    await handleMessage(sock, createMessage({ conversation: " MENU " }));

    assert.equal(sock.sentMessages.length, 0);
    assert.equal(sock.relayedMessages.length, 1);

    const relay = sock.relayedMessages[0];
    const interactiveMessage = relay.message.interactiveMessage;

    assert.equal(interactiveMessage.header.title, "Tugas Baru AsetLink");
    assert.equal(interactiveMessage.header.hasMediaAttachment, true);
    assert.equal(interactiveMessage.header.imageMessage.mimetype, "image/jpeg");
    assert.equal(interactiveMessage.footer.text, "AsetLink SMART System");
    assert.match(interactiveMessage.body.text, /\*Tugas Baru!\*/);
    assert.match(interactiveMessage.body.text, /Tiket: #TK-75777/);
    assert.deepEqual(buttonParams(relay), [
      { display_text: "Mulai Kerjakan", id: "dikerjakan_75777" },
      { display_text: "Tandai Selesai", id: "selesai_75777" },
    ]);
  });
});

test("callback dikerjakan mengubah status dan mengirim tombol selesai", async () => {
  await withSilentConsole(async () => {
    resetDemoTickets();
    const sock = createSock();

    await handleMessage(
      sock,
      createMessage({
        interactiveResponseMessage: {
          nativeFlowResponseMessage: {
            paramsJson: JSON.stringify({ id: "dikerjakan_75777" }),
          },
        },
      })
    );

    assert.deepEqual(sock.sentMessages, [
      {
        jid: "6281234567890@s.whatsapp.net",
        payload: { text: "Status tiket diubah ke Dikerjakan." },
      },
    ]);
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

test("callback selesai mengirim pesan selesai seperti Telegram AsetLink", async () => {
  await withSilentConsole(async () => {
    resetDemoTickets();
    const sock = createSock();

    await handleMessage(
      sock,
      createMessage({
        interactiveResponseMessage: {
          nativeFlowResponseMessage: {
            paramsJson: JSON.stringify({ id: "selesai_75777" }),
          },
        },
      })
    );

    assert.equal(sock.sentMessages.length, 2);
    assert.deepEqual(sock.sentMessages[0], {
      jid: "6281234567890@s.whatsapp.net",
      payload: { text: "Tiket berhasil ditandai Selesai." },
    });
    assert.match(sock.sentMessages[1].payload.text, /\*Tiket Selesai\*/);
    assert.match(sock.sentMessages[1].payload.text, /Tiket: #TK-75777/);
    assert.match(
      sock.sentMessages[1].payload.text,
      /Kerusakan: Kelistrikan \(Lampu \/ Stop Kontak\)/
    );
    assert.match(sock.sentMessages[1].payload.text, /Lokasi: Gedung D \/ R\.382/);
    assert.match(sock.sentMessages[1].payload.text, /Diselesaikan oleh: Pak Budi/);
    assert.match(sock.sentMessages[1].payload.text, /Terima kasih atas kerja kerasnya\./);
  });
});

test("callback selesai menjaga idempotensi saat tiket sudah selesai", async () => {
  await withSilentConsole(async () => {
    resetDemoTickets();
    const sock = createSock();
    const callbackMessage = createMessage({
      interactiveResponseMessage: {
        nativeFlowResponseMessage: {
          paramsJson: JSON.stringify({ id: "selesai_75777" }),
        },
      },
    });

    await handleMessage(sock, callbackMessage);
    await handleMessage(sock, callbackMessage);

    assert.deepEqual(sock.sentMessages.at(-1), {
      jid: "6281234567890@s.whatsapp.net",
      payload: { text: "Tiket ini sudah selesai sebelumnya." },
    });
  });
});

test("handleMessage membalas callback tidak dikenal dengan pesan aman", async () => {
  await withSilentConsole(async () => {
    resetDemoTickets();
    const sock = createSock();

    await handleMessage(
      sock,
      createMessage({
        interactiveResponseMessage: {
          nativeFlowResponseMessage: {
            paramsJson: JSON.stringify({ id: "aksi_lain" }),
          },
        },
      })
    );

    assert.deepEqual(sock.sentMessages, [
      {
        jid: "6281234567890@s.whatsapp.net",
        payload: { text: "Callback tidak dikenal: aksi_lain" },
      },
    ]);
  });
});

test("handleMessage mengabaikan status broadcast dan grup", async () => {
  await withSilentConsole(async () => {
    const sock = createSock();

    await handleMessage(sock, createMessage({ conversation: "menu" }, "status@broadcast"));
    await handleMessage(sock, createMessage({ conversation: "menu" }, "120363000000000000@g.us"));

    assert.equal(sock.sentMessages.length, 0);
    assert.equal(sock.relayedMessages.length, 0);
  });
});

test("handleMessage membalas command status teknisi AsetLink", async () => {
  await withSilentConsole(async () => {
    resetDemoTickets();
    const sock = createSock();

    await handleMessage(sock, createMessage({ conversation: "/status" }));

    assert.equal(sock.sentMessages.length, 1);
    assert.match(sock.sentMessages[0].payload.text, /\*Status Teknisi\*/);
    assert.match(sock.sentMessages[0].payload.text, /Nama: \*Pak Budi\*/);
    assert.match(sock.sentMessages[0].payload.text, /Tugas aktif: \*1\*/);
  });
});
