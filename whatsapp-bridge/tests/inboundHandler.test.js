import assert from "node:assert/strict";
import { test } from "node:test";
import { extractCallbackId, extractQuotedMessageId, extractTextContent, senderCandidates } from "../src/inboundHandler.js";

function createMessage(message) {
  return {
    key: { remoteJid: "6281234567890@s.whatsapp.net" },
    message,
  };
}

test("extractCallbackId membaca native flow callback langsung dan terbungkus", () => {
  const direct = createMessage({
    interactiveResponseMessage: {
      nativeFlowResponseMessage: {
        paramsJson: JSON.stringify({ button_id: "dikerjakan_26" }),
      },
    },
  });

  const wrapped = createMessage({
    ephemeralMessage: {
      message: {
        viewOnceMessageV2: {
          message: {
            interactiveResponseMessage: {
              nativeFlowResponseMessage: {
                paramsJson: JSON.stringify({ id: "selesai_26" }),
              },
            },
          },
        },
      },
    },
  });

  assert.equal(extractCallbackId(direct), "dikerjakan_26");
  assert.equal(extractCallbackId(wrapped), "selesai_26");
});

test("extractTextContent membaca teks dari pesan terbungkus", () => {
  const wrapped = createMessage({
    ephemeralMessage: {
      message: {
        extendedTextMessage: { text: "/status" },
      },
    },
  });

  assert.equal(extractTextContent(wrapped), "/status");
});

test("extractQuotedMessageId membaca stanza id dari response tombol", () => {
  const msg = createMessage({
    buttonsResponseMessage: {
      selectedButtonId: "dikerjakan_9",
      contextInfo: { stanzaId: "MSG-ASSIGN-9" },
    },
  });

  assert.equal(extractQuotedMessageId(msg), "MSG-ASSIGN-9");
});

test("senderCandidates membaca semua kandidat sender", () => {
  const msg = {
    key: {
      remoteJid: "1234567890@s.whatsapp.net",
      participant: "6281234567890@s.whatsapp.net",
      remoteJidAlt: "999@lid",
    },
    message: {},
  };

  assert.deepEqual(senderCandidates(msg), ["1234567890", "6281234567890", "999"]);
});
