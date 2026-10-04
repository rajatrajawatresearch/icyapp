import { parse as legacyParse } from "node:url";
import webpush from "web-push";
import { prisma } from "./db";
import { homePathFor } from "./auth";

// Web Push (free, no third-party service): the browser's own push service
// delivers notifications even when the app is closed. Needs a VAPID key pair
// in VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY; without it push is simply off and
// the in-app bell still works.

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

export function vapidPublicKey() {
  return PUBLIC_KEY && PRIVATE_KEY ? PUBLIC_KEY : null;
}

let configured = false;
function configure() {
  if (configured) return;
  const site = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const subject =
    process.env.VAPID_SUBJECT ??
    (site ? `https://${site}` : "https://localhost");
  webpush.setVapidDetails(subject, PUBLIC_KEY!, PRIVATE_KEY!);
  configured = true;
}

// Only real browser push services: the server POSTs to whatever endpoint a
// client registers, so an arbitrary URL here would be a request-forgery hole.
const PUSH_SERVICE_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /(^|\.)push\.services\.mozilla\.com$/,
  /(^|\.)push\.apple\.com$/,
  /(^|\.)notify\.windows\.com$/,
];

export function isPushServiceEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    return (
      url.protocol === "https:" &&
      !url.port &&
      !url.username &&
      !url.password &&
      // web-push connects using Node's legacy url.parse, which cuts the host
      // at characters (";", "`", "{" …) the modern parser keeps. A plain
      // hostname that both parsers agree on closes that gap. (url.parse logs
      // a one-time deprecation warning; it is called on purpose, to check
      // with the very parser the library uses.)
      /^[a-z0-9.-]+$/.test(url.hostname) &&
      legacyParse(endpoint).hostname === url.hostname &&
      PUSH_SERVICE_HOSTS.some((re) => re.test(url.hostname))
    );
  } catch {
    return false;
  }
}

export type PushRecipients = { adminIds: string[]; customerId: string | null };
export type PushMessage = { title: string; body: string; tag: string };

/** Sends to every device of the recipients. Dead subscriptions are removed. */
export async function sendPush(to: PushRecipients, message: PushMessage) {
  if (!vapidPublicKey()) return;
  const owners = [
    ...(to.adminIds.length
      ? [{ adminId: { in: to.adminIds }, admin: { isActive: true } }]
      : []),
    ...(to.customerId
      ? [
          {
            customerId: to.customerId,
            customer: { isActive: true, scheduledDeleteAt: null },
          },
        ]
      : []),
  ];
  if (!owners.length) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { OR: owners },
    include: {
      admin: { select: { role: true, modules: true } },
      customer: { select: { token: true } },
    },
  });
  if (!subs.length) return;
  configure();

  await Promise.all(
    subs.map(async (s) => {
      // Tapping the notification opens that person's own screen.
      const url = s.admin
        ? homePathFor(s.admin)
        : `/u/${s.customer!.token}/orders`;
      try {
        // Checked again at send time: never connect anywhere but a push service.
        if (!isPushServiceEndpoint(s.endpoint)) {
          await prisma.pushSubscription.delete({ where: { id: s.id } });
          return;
        }
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ ...message, url }),
          { TTL: 6 * 60 * 60, urgency: "high" },
        );
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // The browser unsubscribed or the subscription expired.
          await prisma.pushSubscription
            .delete({ where: { id: s.id } })
            .catch(() => {});
        } else {
          console.error("[push] delivery failed", status ?? e);
        }
      }
    }),
  );
}
