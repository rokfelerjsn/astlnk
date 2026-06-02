import { postInbound } from "./laravelClient.js";
import { normalizePhone } from "./phone.js";

function unwrapMessage(message) {
  let current = message;

  for (let index = 0; index < 8; index += 1) {
    const next =
      current?.ephemeralMessage?.message ||
      current?.viewOnceMessage?.message ||
      current?.viewOnceMessageV2?.message ||
      current?.viewOnceMessageV2Extension?.message ||
      current?.documentWithCaptionMessage?.message ||
      current?.editedMessage?.message ||
      current?.protocolMessage?.editedMessage;

    if (!next) {
      return current;
    }

    current = next;
  }

  return current;
}

export function extractCallbackId(msg) {
  const message = unwrapMessage(msg.message);
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
      const params = JSON.parse(interactiveResponse.nativeFlowResponseMessage.paramsJson);
      return params.id ||
        params.selected_id ||
        params.button_id ||
        params.row_id ||
        params.single_select_reply?.selectedRowId ||
        null;
    } catch {
      return null;
    }
  }

  return null;
}

export function extractTextContent(msg) {
  const message = unwrapMessage(msg.message);

  if (!message) {
    return "";
  }

  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  if (message.imageMessage?.caption) return message.imageMessage.caption;
  if (message.videoMessage?.caption) return message.videoMessage.caption;
  if (message.documentMessage?.caption) return message.documentMessage.caption;

  return "";
}

export function extractQuotedMessageId(msg) {
  const message = unwrapMessage(msg.message);
  const contextInfo =
    message?.buttonsResponseMessage?.contextInfo ||
    message?.listResponseMessage?.contextInfo ||
    message?.templateButtonReplyMessage?.contextInfo ||
    message?.interactiveResponseMessage?.contextInfo ||
    message?.extendedTextMessage?.contextInfo ||
    message?.conversation?.contextInfo ||
    null;

  return contextInfo?.stanzaId || null;
}

export function senderCandidates(msg) {
  const values = [
    msg.key?.remoteJid,
    msg.key?.participant,
    msg.key?.remoteJidAlt,
    msg.key?.participantAlt,
    msg.key?.senderPn,
    msg.key?.participantPn,
    msg.participant,
    msg.sender,
  ];

  return Array.from(new Set(values.map((value) => normalizePhone(value)).filter(Boolean)));
}

export async function handleInboundMessage(msg, context = {}) {
  const fromJid = msg.key?.remoteJid;

  if (!fromJid || fromJid === "status@broadcast" || fromJid.endsWith("@g.us")) {
    return;
  }

  const candidates = senderCandidates(msg);
  const from = candidates[0] || normalizePhone(fromJid);

  if (!from) {
    return;
  }

  const callbackId = extractCallbackId(msg);
  const text = extractTextContent(msg).trim();
  const quotedMessageId = extractQuotedMessageId(msg);

  if (!callbackId && !text) {
    return;
  }

  await postInbound({
    device_id: context.deviceId,
    from,
    from_jid: fromJid,
    sender_candidates: candidates,
    callback_id: callbackId,
    quoted_message_id: quotedMessageId,
    text,
    raw: msg,
  });
}
