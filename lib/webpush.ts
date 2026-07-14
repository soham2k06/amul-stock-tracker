import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL ?? "mailto:admin@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export { webpush };

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string }
): Promise<"sent" | "expired"> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
    return "sent";
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    // 410/404: the browser's push service no longer has this subscription.
    // 401/403: the subscription was created under a different VAPID key
    // (e.g. after a key rotation) and can never succeed again either way.
    if (status === 410 || status === 404 || status === 401 || status === 403) {
      return "expired";
    }
    throw err;
  }
}
