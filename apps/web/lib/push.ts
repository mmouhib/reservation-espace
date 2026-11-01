const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** The browser's VAPID key format (URL-safe base64) as the bytes `subscribe` wants. */
function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = base64.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

/** Push needs a VAPID key, a service worker and a browser that supports it (on iPhone: the installed app). */
export function isPushAvailable(): boolean {
  return Boolean(VAPID_PUBLIC_KEY) && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * Asks for notification permission and subscribes this browser to push, through the app's
 * service worker. Returns null when push is unavailable or the permission is refused.
 */
export async function requestPushSubscription(): Promise<PushSubscriptionData | null> {
  if (!isPushAvailable()) return null;
  if ((await Notification.requestPermission()) !== "granted") return null;

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
  const { endpoint, keys } = subscription.toJSON();
  if (!endpoint || !keys?.p256dh || !keys.auth) return null;
  return { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}
