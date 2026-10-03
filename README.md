# Bazar

A mobile-first ordering app for one store and its known customers. Customers order through a private link (`/u/<token>`, no signup), pay by cash or a UPI QR the store uploads, and follow their order live. Store staff run everything from an admin panel; delivery partners get their own screen.

The original spec is in [`docs/BUILD_BRIEF.md`](docs/BUILD_BRIEF.md) and [`docs/PRD.html`](docs/PRD.html).

## Stack

Next.js 16 (App Router, TypeScript) · PostgreSQL · Prisma 6 · Tailwind CSS 4 · bcryptjs · JWT session cookie (`jose`) · Web Push (`web-push`) · Leaflet + OpenStreetMap · Vercel Blob for uploads in production (local disk in dev).

## Run locally

```bash
cp .env.example .env          # DATABASE_URL + AUTH_SECRET (openssl rand -hex 32)
npm install
npx prisma migrate dev        # create the tables
npm run db:seed               # SUPER_ADMIN admin@test.com / changeme123
npx next dev -p 3210          # http://localhost:3210
```

## Who uses it

| Who | How they get in | What they do |
| --- | --- | --- |
| Customer | Their private link `/u/<token>`, which works on one device only | Shop, check out (delivery with a map pin, or pickup), pay, send a payment screenshot, follow the order, confirm "I've received my order" |
| Admin | Email + password, or a private sign-in link `/a/<token>` | Orders, products, customers, delivery team, reports |
| Super admin | Same | Everything, plus Settings (store, team, data reset), the audit log (a tab of Reports), deletes |
| Delivery partner | Same; lands on `/delivery` | Only their assigned orders: call, navigate, collect cash, mark delivered |

## How the main pieces work

- **Order flow.** Placed → Confirmed → (Paid) → On the way / Ready → Completed. Cancelling returns stock. On the order card, status and delivery partner save the moment they are picked (there is no save button; the card says "Saving…" then "Saved").
- **UPI payments.** Manual by design: the store uploads a QR per order, the customer pays and uploads one or more screenshots as proof (up to 6, `PaymentProof`), staff open them on the order card and press Mark paid. A screenshot never marks an order paid by itself.
- **Stock is optional.** `Product.stockQty` is null unless the store ticks "Limit stock" on the product. Null means always available: nothing is counted, decremented or returned.
- **One device per customer link.** The first device to open a link (with a tap on the welcome screen) becomes its only device: a random secret in an httpOnly cookie, its hash on the customer (`src/lib/device.ts`, `src/lib/customer.ts`). Any other device gets a "link in use on another device" screen, and the customer APIs refuse it too. Staff can "Reset device" (same link, next device claims it) or regenerate the link. A browser exposes no MAC address and a phone's IP changes all day, so neither is used.
- **Share address.** With `NEXT_PUBLIC_LINK_ORIGIN` set, customer links are copied with that address (a random `.vercel.app` name that says nothing about the app) and `/u/*` opened on any other address is redirected there, so the device cookie lives in one place.
- **Customer phone numbers** must be Indian mobiles; they are stored as `+91 98765 43210` however they were typed (`src/lib/phone.ts`).
- **Screen privacy.** A website cannot block screenshots or screen recording; only a native app can. What the app does instead (`src/components/ScreenShield.tsx`, `Watermark.tsx`): covers itself when it is in the background or its window loses focus, when Print Screen or Cmd/Win+Shift is pressed, blocks printing and saving images, and tiles the viewer's name faintly over every screen so a screenshot shows who took it.
- **Notifications.** Every order event creates a notification for the people who must act on it (store staff, the assigned rider, the customer). They appear under the bell, and as push notifications on devices that opted in (`src/lib/notify.ts`, `src/lib/push.ts`, `public/sw.js`).
- **Sign-in links for staff.** A private link signs a staff member in without a password. Only its hash is stored, so it is shown once; refreshing it kills the old link and signs that account out everywhere (`src/lib/access-link.ts`). A super admin can refresh anyone's link, an admin only delivery partners'.
- **Deleting.** Super admin only. A delete is scheduled 1–30 minutes out; the row is hidden at once, can be undone until the timer ends, and is then purged lazily. Deleting a customer or product never destroys order history.
- **Delivery charge.** The super admin sets a charge per delivery and, optionally, an order value from which delivery is free (Settings). The server works the charge out when the order is placed (`src/lib/pricing.ts`) and stores it on the order; it is part of the amount to pay. An admin can set a different charge on a single order while its payment is pending — the customer is notified and a UPI QR made for the old amount is removed.
- **Polling.** Lists refresh every 6 seconds with an ETag, so an unchanged list costs an empty `304`. Writes go through the poller's `during()`, which drops any poll that overlapped the write so stale data can't flash back on screen.

## Design system

Every colour lives in `src/app/globals.css` as a token (`bg-surface`, `text-ink-2`, `bg-brand-600`, `text-danger-ink` …). Tailwind's built-in palette is switched off there, so a raw colour in a component simply produces no CSS. The palette is brown, gray, red, green, black and white: a white light theme, a charcoal dark theme, and four accents (Brown, Gray, Red, Green). Themes and accents only swap CSS variables. Class recipes shared by all screens are in `src/components/ui.ts`.

The logo is one SVG, `public/brand/icon.svg`. After changing it, regenerate the app icons:

```bash
node scripts/generate-icons.mjs
```

The product name is a single constant in `src/lib/brand.ts`.

## Deploying (Vercel)

Pushing to `main` deploys. The build runs `vercel-build`: `prisma generate`, `prisma migrate deploy`, then `next build`. Environment variables: `DATABASE_URL` / `DATABASE_URL_UNPOOLED` (Neon), `BLOB_READ_WRITE_TOKEN` (uploads), `AUTH_SECRET`, and optionally `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` for push notifications and `NEXT_PUBLIC_LINK_ORIGIN` for the address customer links are shared under.

## Schema notes (additions beyond the brief)

- `Admin.isActive`, `Admin.sessionVersion`, `Admin.accessTokenHash`: deactivation, ending sessions, private sign-in links.
- `Order.number`: a short reference (`#12`) people can read aloud.
- `Order.customerName/Phone`, `OrderItem.productName`: history survives when a customer or product is deleted.
- `Order.deliveryLat/Lng`, `deliveryPartnerId`, `deliveredAt`, `receivedAt`, `deliveryFee`: delivery pin, assignment, hand-over, the customer's confirmation and the delivery charge.
- `Notification`, `PushSubscription`, `StoreSettings` (pickup location, delivery charge).
- `Product.stockQty` is nullable (null = not tracked). `PaymentProof`: the customer's payment screenshots. `Customer.deviceHash/deviceBoundAt`: the one device a link belongs to.
