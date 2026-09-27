# Mini Marketplace

Mobile-first web app for a single store with ~2000 known customers. Customers order through a private link (`/u/<token>`, no signup), pay cash or by a manually uploaded UPI QR, and admins run everything from a small panel.

Spec: [`docs/BUILD_BRIEF.md`](docs/BUILD_BRIEF.md) · [`docs/PRD.html`](docs/PRD.html)

## Stack

Next.js 16 (App Router, TypeScript) · PostgreSQL · Prisma 6 · Tailwind CSS 4 · bcryptjs · JWT session cookie (`jose`) · local uploads in `public/uploads` (served via `/api/files/<name>`) · polling every 6s (no WebSockets).

## Run locally

```bash
cp .env.example .env          # set DATABASE_URL + AUTH_SECRET (openssl rand -hex 32)
npm install
npx prisma migrate dev        # creates tables
npm run db:seed               # SUPER_ADMIN admin@test.com / changeme123
npm run dev                   # http://localhost:3000
```

Phones on the same Wi-Fi can open `http://<your-LAN-IP>:3000/u/<token>` (add the IP to `allowedDevOrigins` in `next.config.ts`).

## Routes

| Who         | Route                   | What                                                                                           |
| ----------- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| Customer    | `/u/[token]`            | Product grid, cart, checkout (delivery/pickup, cash/UPI)                                       |
| Customer    | `/u/[token]/orders`     | Order history, live status, UPI QR "scan to pay"                                               |
| Admin       | `/admin/login`          | Email + password                                                                               |
| Admin       | `/admin/orders`         | Live orders (6s poll, new-order highlight + chime), upload QR, mark paid, status               |
| Admin       | `/admin/products`       | Add/edit/activate products with photo                                                          |
| Admin       | `/admin/customers`      | Add customer → private link, copy, regenerate, revoke                                          |
| Admin       | `/admin/reports`        | Today's orders / cash / UPI / pending UPI, recent payments (+ platform totals for super admin) |
| Super admin | `/superadmin/admins`    | Create / deactivate admin accounts                                                             |
| Super admin | `/superadmin/audit-log` | Every sensitive action, newest first                                                           |

## Delete flow (super admin only)

Delete → choose 1/5/10/30 min → the row sets `scheduledDeleteAt` and disappears at once (a deleted customer's link stops working right away). A "Recently deleted" section shows a countdown and an **Undo** button. Expired rows are purged lazily on admin list loads (the orders page polls every 6s). Scheduling and undoing a delete are both written to the audit log.

## Schema notes (small additions beyond the brief)

- `Admin.isActive`: needed for "deactivate admin".
- `Order.number`: a short sequential reference (`#12`) that customers and staff can read aloud.
- `OrderItem.productName` plus a nullable `productId`: order history survives when a product is permanently deleted.
- `AuditLog.details`: a readable description of what the action touched.
