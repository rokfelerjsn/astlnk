import { sendButtons } from "@ryuu-reinzz/button-helper";
import { prepareWAMessageMedia } from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

function pad(value) {
  return String(value).padStart(2, "0");
}

function mediaLogger(sock) {
  const logger = sock.logger;
  const methods = ["debug", "info", "warn", "error"];

  if (logger && methods.every((method) => typeof logger[method] === "function")) {
    return logger;
  }

  return {
    debug() {},
    info() {},
    warn() {},
    error() {},
  };
}

export function resolvePhotoPath(photoPath) {
  if (!photoPath) {
    return null;
  }

  const candidates = [
    path.isAbsolute(photoPath) ? photoPath : path.resolve(photoPath),
    path.resolve(process.cwd(), photoPath),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function normalizeTicket(ticket) {
  return {
    id: ticket.id,
    category: ticket.category ?? ticket.category_name ?? "",
    building: ticket.building ?? "",
    room: ticket.room ?? "",
    reporterName: ticket.reporterName ?? ticket.reporter_name ?? "",
    reporterPhone: ticket.reporterPhone ?? ticket.reporter_phone ?? "",
    description: ticket.description ?? "",
    ticketCode: ticket.ticketCode ?? ticket.ticket_code ?? "",
    createdAt: ticket.createdAt ?? ticket.created_at ?? "",
    resolvedAt: ticket.resolvedAt ?? ticket.resolved_at ?? "",
    technicianName: ticket.technicianName ?? ticket.technician_name ?? "",
    photoPath: ticket.photoPath ?? ticket.photo_path ?? null,
    photoUrl: ticket.photoUrl ?? ticket.photo_url ?? null,
  };
}

export function formatAsetLinkDate(value) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${pad(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatTaskMessage(ticket) {
  const data = normalizeTicket(ticket);

  return `*Tugas Baru!*

Kerusakan: *${data.category}*
Lokasi: ${data.building} / R.${data.room}
Pelapor: ${data.reporterName} (${data.reporterPhone})
Deskripsi: ${data.description}

Tiket: #${data.ticketCode}
Waktu Lapor: ${formatAsetLinkDate(data.createdAt)}`;
}

export function formatDoneMessage(ticket) {
  const data = normalizeTicket(ticket);

  return `*Tiket Selesai*

Tiket: #${data.ticketCode}
Kerusakan: ${data.category}
Lokasi: ${data.building} / R.${data.room}
Diselesaikan oleh: ${data.technicianName}
Waktu: ${formatAsetLinkDate(data.resolvedAt)}

Terima kasih atas kerja kerasnya.`;
}

export function taskButtons(ticket) {
  const data = normalizeTicket(ticket);

  return [
    { id: `dikerjakan_${data.id}`, text: "Mulai Kerjakan" },
    { id: `selesai_${data.id}`, text: "Tandai Selesai" },
  ];
}

export function completionButton(ticket) {
  const data = normalizeTicket(ticket);

  return [{ id: `selesai_${data.id}`, text: "Tandai Selesai" }];
}

export async function sendTaskImage(sock, jid, ticket) {
  const data = normalizeTicket(ticket);
  const photoPath = resolvePhotoPath(data.photoPath);

  if (!photoPath && !data.photoUrl) {
    return null;
  }

  return sock.sendMessage(jid, {
    image: photoPath ? fs.readFileSync(photoPath) : { url: data.photoUrl },
    caption: formatTaskMessage(ticket),
  });
}

export async function prepareTaskImageHeader(sock, ticket) {
  const data = normalizeTicket(ticket);
  const photoPath = resolvePhotoPath(data.photoPath);

  if ((!photoPath && !data.photoUrl) || typeof sock.waUploadToServer !== "function") {
    return null;
  }

  const media = await prepareWAMessageMedia(
    { image: photoPath ? fs.readFileSync(photoPath) : { url: data.photoUrl } },
    {
      upload: sock.waUploadToServer,
      logger: mediaLogger(sock),
    }
  );

  return media.imageMessage ?? null;
}

async function sendButtonsWithImageHeader(sock, jid, payload, imageMessage) {
  if (!imageMessage) {
    return sendButtons(sock, jid, payload);
  }

  const originalRelay = sock.relayMessage.bind(sock);

  sock.relayMessage = async (relayJid, message, options) => {
    if (message?.interactiveMessage) {
      message.interactiveMessage.header = message.interactiveMessage.header ?? {};
      message.interactiveMessage.header.hasMediaAttachment = true;
      message.interactiveMessage.header.imageMessage = imageMessage;
    }

    return originalRelay(relayJid, message, options);
  };

  try {
    return await sendButtons(sock, jid, payload);
  } finally {
    sock.relayMessage = originalRelay;
  }
}

export async function sendTaskNotification(sock, jid, ticket) {
  const payload = {
    title: "Tugas Baru AsetLink",
    text: formatTaskMessage(ticket),
    footer: "AsetLink SMART System",
    buttons: taskButtons(ticket),
  };

  let imageMessage = null;

  try {
    imageMessage = await prepareTaskImageHeader(sock, ticket);
  } catch (err) {
    console.error(`[MEDIA] Gagal menyiapkan header image: ${err.message}`);
  }

  if (imageMessage) {
    return sendButtonsWithImageHeader(sock, jid, payload, imageMessage);
  }

  await sendTaskImage(sock, jid, ticket);

  return sendButtons(sock, jid, payload);
}

export async function sendCompletionPrompt(sock, jid, ticket) {
  const data = normalizeTicket(ticket);

  return sendButtons(sock, jid, {
    title: "Tugas Dikerjakan",
    text: `Tiket: #${data.ticketCode}
Status: Dikerjakan

Tekan tombol di bawah untuk menyelesaikan.`,
    footer: "AsetLink SMART System",
    buttons: completionButton(ticket),
  });
}
