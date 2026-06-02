export const config = {
  host: process.env.WHATSAPP_BRIDGE_HOST || "127.0.0.1",
  port: Number(process.env.WHATSAPP_BRIDGE_PORT || process.env.PORT || 7474),
  apiKey: process.env.WHATSAPP_BRIDGE_API_KEY || "",
  laravelApiUrl: (process.env.LARAVEL_API_URL || "http://127.0.0.1:8000/api").replace(/\/$/, ""),
  laravelBridgeKey: process.env.LARAVEL_BRIDGE_KEY || process.env.WHATSAPP_BRIDGE_API_KEY || "",
  defaultDeviceId: process.env.WHATSAPP_DEFAULT_DEVICE_ID || "1",
};
