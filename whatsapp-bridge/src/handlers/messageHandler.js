import { demoTicket, findTicket } from "../data/demoTickets.js";
import {
  formatAsetLinkDate,
  formatDoneMessage,
  sendCompletionPrompt,
  sendTaskNotification,
} from "../messages/taskNotification.js";

export function extractCallbackId(msg) {
  const message = msg.message;

  const buttonsResponse = message?.buttonsResponseMessage;
  if (buttonsResponse?.selectedButtonId) {
    return buttonsResponse.selectedButtonId;
  }

  const listResponse = message?.listResponseMessage;
  if (listResponse?.singleSelectReply?.selectedRowId) {
    return listResponse.singleSelectReply.selectedRowId;
  }

  const templateReply = message?.templateButtonReplyMessage;
  if (templateReply?.selectedId) {
    return templateReply.selectedId;
  }

  const interactiveResponse = message?.interactiveResponseMessage;
  if (interactiveResponse?.nativeFlowResponseMessage?.paramsJson) {
    try {
      const params = JSON.parse(
        interactiveResponse.nativeFlowResponseMessage.paramsJson
      );
      return params.id || params.selected_id || null;
    } catch {
      return null;
    }
  }

  return null;
}

export function extractTextContent(msg) {
  const message = msg.message;
  if (!message) return "";

  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  if (message.imageMessage?.caption) return message.imageMessage.caption;
  if (message.videoMessage?.caption) return message.videoMessage.caption;
  if (message.documentMessage?.caption) return message.documentMessage.caption;

  return "";
}

function parseActionId(actionId) {
  const match = /^(dikerjakan|selesai)_(.+)$/.exec(actionId);

  if (!match) {
    return null;
  }

  return {
    action: match[1],
    ticketId: match[2],
  };
}

async function handleTaskAction(sock, jid, actionId) {
  const parsed = parseActionId(actionId);

  if (!parsed) {
    await sock.sendMessage(jid, {
      text: `Callback tidak dikenal: ${actionId}`,
    });
    return;
  }

  const ticket = findTicket(parsed.ticketId);

  if (!ticket) {
    await sock.sendMessage(jid, { text: "Tiket tidak ditemukan." });
    return;
  }

  if (parsed.action === "dikerjakan") {
    if (ticket.status === "Selesai") {
      await sock.sendMessage(jid, { text: "Tiket ini sudah selesai." });
      return;
    }

    if (ticket.status === "Dikerjakan") {
      await sock.sendMessage(jid, { text: "Tiket ini sedang dikerjakan." });
      return;
    }

    ticket.status = "Dikerjakan";

    await sock.sendMessage(jid, {
      text: "Status tiket diubah ke Dikerjakan.",
    });
    await sendCompletionPrompt(sock, jid, ticket);
    return;
  }

  if (ticket.status === "Selesai") {
    await sock.sendMessage(jid, {
      text: "Tiket ini sudah selesai sebelumnya.",
    });
    return;
  }

  ticket.status = "Selesai";
  ticket.resolvedAt = formatAsetLinkDate(new Date());

  await sock.sendMessage(jid, {
    text: "Tiket berhasil ditandai Selesai.",
  });
  await sock.sendMessage(jid, {
    text: formatDoneMessage(ticket),
  });
}

async function handleCommand(sock, jid, text) {
  if (text === "menu" || text === "tugas" || text === "/test-ticket") {
    await sendTaskNotification(sock, jid, demoTicket());
    return;
  }

  if (text === "/start") {
    await sock.sendMessage(jid, {
      text:
        "Halo *Pak Budi*!\n\n" +
        "Bot AsetLink ITATS aktif.\n" +
        "Anda akan menerima notifikasi tugas perbaikan di sini.\n\n" +
        "Ketik /help untuk melihat daftar perintah.",
    });
    return;
  }

  if (text === "/help") {
    await sock.sendMessage(jid, {
      text:
        "*Daftar Perintah AsetLink Bot*\n\n" +
        "/start - Mulai bot dan cek status\n" +
        "/help - Tampilkan bantuan\n" +
        "/status - Cek status akun teknisi\n\n" +
        "Bot ini akan mengirim notifikasi otomatis saat ada tugas perbaikan baru.",
    });
    return;
  }

  if (text === "/status") {
    const ticket = demoTicket();
    const activeTickets = ["Ditugaskan", "Dikerjakan"].includes(ticket.status)
      ? 1
      : 0;
    const completedTickets = ticket.status === "Selesai" ? 1 : 0;

    await sock.sendMessage(jid, {
      text:
        "*Status Teknisi*\n\n" +
        "Nama: *Pak Budi*\n" +
        "Status: Aktif\n\n" +
        `Tugas aktif: *${activeTickets}*\n` +
        `Tugas selesai: *${completedTickets}*`,
    });
    return;
  }

  if (text.startsWith("/")) {
    await sock.sendMessage(jid, {
      text:
        `Perintah *${text}* tidak dikenali.\n\n` +
        "Ketik /help untuk melihat perintah yang tersedia.",
    });
    return;
  }

  await sock.sendMessage(jid, {
    text: 'Ketik "menu" untuk mengirim contoh tugas AsetLink.',
  });
}

export async function handleMessage(sock, msg) {
  const jid = msg.key.remoteJid;
  if (!jid) return;

  if (jid === "status@broadcast") return;
  if (jid.endsWith("@g.us")) return;

  const callbackId = extractCallbackId(msg);

  if (callbackId) {
    console.log(`[CB] Callback diterima: "${callbackId}" dari ${jid}`);
    await handleTaskAction(sock, jid, callbackId);
    return;
  }

  const text = extractTextContent(msg).trim().toLowerCase();
  if (!text) return;

  console.log(`[MSG] Pesan diterima: "${text}" dari ${jid}`);

  try {
    await handleCommand(sock, jid, text);
  } catch (err) {
    console.error(`[MSG] Gagal memproses pesan: ${err.message}`);
    await sock.sendMessage(jid, {
      text: "Maaf, bot gagal memproses pesan. Coba lagi nanti.",
    });
  }
}
