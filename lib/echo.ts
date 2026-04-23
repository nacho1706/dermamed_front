import { getToken } from "@/lib/api";
import Echo from "laravel-echo";
import Pusher from "pusher-js";

declare global {
  interface Window {
    Pusher: any;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let echoInstance: any = null;

/**
 * Returns a singleton Echo instance, creating it lazily on first call.
 * Must only be called client-side (after the user is authenticated).
 */
export function getEcho(): any {
  if (typeof window === "undefined") return null;
  if (echoInstance) return echoInstance;

  window.Pusher = Pusher;

  echoInstance = new Echo({
    broadcaster: "reverb",
    key: process.env.NEXT_PUBLIC_REVERB_APP_KEY,
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST,
    wsPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080),
    wssPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080),
    forceTLS: process.env.NEXT_PUBLIC_REVERB_SCHEME === "https",
    enabledTransports: ["ws", "wss"],
    authEndpoint: `${process.env.NEXT_PUBLIC_APP_URL}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${getToken() ?? ""}`,
      },
    },
  });

  return echoInstance;
}

/**
 * Disconnects and removes the singleton instance.
 * Call on logout so a fresh instance is created on next login.
 */
export function disconnectEcho(): void {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
}
