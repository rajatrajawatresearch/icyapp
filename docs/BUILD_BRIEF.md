# Build brief — Mini marketplace app

Paste this whole file into Claude Code as the first instruction. Build the full working MVP end-to-end. Ask nothing unless truly blocked — pick sensible defaults and proceed.

## Stack (use exactly this — no substitutions)
- Next.js (React + TypeScript, App Router)
- PostgreSQL — use Neon or Supabase (whichever is easier to spin up locally/dev; SQLite is fine for local dev if Postgres setup is slow, but final schema must be Postgres-compatible)
- Prisma as ORM
- Tailwind CSS for styling — mobile-first, this is a web app opened on phones, not a native app
- bcrypt for admin/super-admin password hashing
- File uploads (QR images, product photos) → local `/public/uploads` for now (swap for Supabase Storage/Cloudinary later, don't build that integration yet)
- No WebSockets — admin order list refreshes via polling every 6 seconds

## Data model (Prisma schema)
- `Customer`: id, name, phone, token (unique, random 16-char string), isActive (bool, default true), scheduledDeleteAt (nullable DateTime), createdAt
- `Admin`: id, name, email (unique), passwordHash, role (enum: ADMIN, SUPER_ADMIN), createdAt
- `Product`: id, adminId (FK), name, price (decimal), stockQty (int), imageUrl (nullable string), isActive (bool default true), category (string), scheduledDeleteAt (nullable), createdAt
- `Order`: id, customerId (FK), status (enum: PLACED, CONFIRMED, PAID, OUT_FOR_DELIVERY, COMPLETED, CANCELLED, default PLACED), fulfilmentType (enum: DELIVERY, PICKUP), deliveryAddress (nullable string), scheduledDeleteAt (nullable), createdAt
- `OrderItem`: id, orderId (FK), productId (FK), qty (int), priceAtOrder (decimal)
- `Payment`: id, orderId (FK, unique), method (enum: CASH, UPI), amount (decimal), status (enum: PENDING, PAID, default PENDING), qrImageUrl (nullable), confirmedByAdminId (nullable FK), confirmedAt (nullable), createdAt
- `AuditLog`: id, actorAdminId (FK), action (string), targetId (string), createdAt

Run migrations, seed one SUPER_ADMIN account (email: admin@test.com / password: changeme123 — print this in console after seeding).

## Pages/routes to build

### Customer-facing (no login, mobile-first)
- `/u/[token]` — resolves customer by token (404/"link invalid" if not found or isActive=false or scheduledDeleteAt is set). Shows: product grid (active products only, name/price/image/stock), add to cart, checkout.
- Checkout flow on same page or `/u/[token]/checkout`: choose Delivery (show address textbox) or Pickup; choose Cash or UPI; place order → creates Order + OrderItems + Payment (status PENDING for UPI, still PENDING for cash until admin marks paid on delivery — but don't block order creation either way).
- `/u/[token]/orders` — customer's own order history + live status (poll every 6s while an order is not yet COMPLETED/CANCELLED). If UPI and QR uploaded, show the QR image with "scan to pay" and current payment status.

### Admin (login required — email+password, session cookie or JWT, your choice)
- `/admin/login`
- `/admin/products` — list, add, edit, toggle active, delete (delete = set scheduledDeleteAt = now + N minutes, see Delete flow below)
- `/admin/customers` — list, add (name+phone → generates token, show shareable link `/u/<token>` with a copy button), regenerate token (invalidates old link, shows new one), delete
- `/admin/orders` — polls every 6s, shows new orders highlighted. For UPI orders with Payment.status=PENDING: upload QR image button → sets Payment.qrImageUrl. "Mark paid" button → sets Payment.status=PAID, confirmedByAdminId, confirmedAt. Update order status dropdown (CONFIRMED/OUT_FOR_DELIVERY/COMPLETED/CANCELLED). Delete button on orders too.
- `/admin/reports` — simple counts: today's orders, today's cash total, today's UPI total, pending UPI confirmations count

### Super admin (same login, role=SUPER_ADMIN, extra pages)
- `/superadmin/admins` — list/create/deactivate admin accounts
- `/superadmin/audit-log` — list AuditLog rows, newest first
- Delete buttons across the app (products/customers/orders) are visible to SUPER_ADMIN only; ADMIN role does not see delete buttons — only SUPER_ADMIN can delete.

## Delete flow (important — implement exactly this)
1. SUPER_ADMIN clicks "Delete" on a row → modal asks "delete in: 1 min / 5 min / 10 min / 30 min" (dropdown, default 5).
2. Sets `scheduledDeleteAt = now() + chosen minutes` on that row. Row disappears from normal admin views immediately (filter out anything with scheduledDeleteAt not null and in the past-or-future — i.e. any non-null value hides it right away).
3. Show a small "Recently deleted" section in that page listing rows with scheduledDeleteAt set but still in the future, each with an "Undo" button that sets scheduledDeleteAt back to null.
4. A background job (simplest: a `setInterval` in a Next.js API route hit by a cron service, OR check-and-delete lazily on every admin page load — pick whichever is faster to build) permanently deletes any row where `scheduledDeleteAt <= now()`.
5. Write an AuditLog row when delete is scheduled and when undo happens.

## Explicitly out of scope for this build (do not build these yet)
- Payment gateway integration (Razorpay/PhonePe API) — QR upload is manual, that's correct per spec
- SMS/WhatsApp API integration for sending the customer link — admin just copies the link manually
- Multi-store support
- Native mobile app — this is a responsive web app only

## Done criteria
A SUPER_ADMIN can log in, add a product, add a customer, get that customer's link, open it in another browser/incognito, place an order (try both cash and UPI), see it appear in `/admin/orders`, upload a QR, mark it paid, and delete the test customer with undo working before the timer runs out.
