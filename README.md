# Icy

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
| Customer | Their private link `/u/<token>` | Shop, check out (delivery with a map pin, or pickup), pay, follow the order, confirm "I've received my order" |
| Admin | Email + password, or a private sign-in link `/a/<token>` | Orders, products, customers, delivery team, reports |
| Super admin | Same | Everything, plus team accounts, audit log, settings, data reset, deletes |
| Delivery partner | Same; lands on `/delivery` | Only their assigned orders: call, navigate, collect cash, mark delivered |

## How the main pieces work

- **Order flow.** Placed → Confirmed → (Paid) → On the way / Ready → Completed. UPI is manual: the store uploads a QR per order and marks it paid. Cancelling returns stock.
- **Notifications.** Every order event creates a notification for the people who must act on it (store staff, the assigned rider, the customer). They appear under the bell, and as push notifications on devices that opted in (`src/lib/notify.ts`, `src/lib/push.ts`, `public/sw.js`).
- **Sign-in links for staff.** A private link signs a staff member in without a password. Only its hash is stored, so it is shown once; refreshing it kills the old link and signs that account out everywhere (`src/lib/access-link.ts`). A super admin can refresh anyone's link, an admin only delivery partners'.
- **Deleting.** Super admin only. A delete is scheduled 1–30 minutes out; the row is hidden at once, can be undone until the timer ends, and is then purged lazily. Deleting a customer or product never destroys order history.
- **Polling.** Lists refresh every 6 seconds with an ETag, so an unchanged list costs an empty `304`.

## Design system

Every colour lives in `src/app/globals.css` as a token (`bg-surface`, `text-ink-2`, `bg-brand-600`, `text-danger-ink` …). Tailwind's built-in palette is switched off there, so a raw colour in a component simply produces no CSS. Light/dark and the four accent "flavours" only swap CSS variables. Class recipes shared by all screens are in `src/components/ui.ts`.

The logo is one SVG, `public/brand/icon.svg`. After changing it, regenerate the app icons:

```bash
node scripts/generate-icons.mjs
```

The product name is a single constant in `src/lib/brand.ts`.

## Deploying (Vercel)

Pushing to `main` deploys. The build runs `vercel-build`: `prisma generate`, `prisma migrate deploy`, then `next build`. Environment variables: `DATABASE_URL` / `DATABASE_URL_UNPOOLED` (Neon), `BLOB_READ_WRITE_TOKEN` (uploads), `AUTH_SECRET`, and optionally `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` for push notifications.

## Schema notes (additions beyond the brief)

- `Admin.isActive`, `Admin.sessionVersion`, `Admin.accessTokenHash`: deactivation, ending sessions, private sign-in links.
- `Order.number`: a short reference (`#12`) people can read aloud.
- `Order.customerName/Phone`, `OrderItem.productName`: history survives when a customer or product is deleted.
- `Order.deliveryLat/Lng`, `deliveryPartnerId`, `deliveredAt`, `receivedAt`: delivery pin, assignment, hand-over and the customer's confirmation.
- `Notification`, `PushSubscription`, `StoreSettings`.
