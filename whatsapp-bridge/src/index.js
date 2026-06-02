import { startHttpServer } from "./httpServer.js";
import { startExistingDevices } from "./sessionManager.js";

console.log("=== AsetLink WhatsApp Bridge ===");

startHttpServer();
startExistingDevices();
