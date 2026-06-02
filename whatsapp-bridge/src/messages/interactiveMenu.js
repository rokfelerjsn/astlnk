import { demoTicket } from "../data/demoTickets.js";
import { sendTaskNotification } from "./taskNotification.js";

export async function sendInteractiveMenu(sock, jid) {
  return sendTaskNotification(sock, jid, demoTicket());
}
