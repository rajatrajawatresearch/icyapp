import type { Prisma } from "@prisma/client";
import type { OrderStatusValue } from "./constants";

// Plain JSON shapes sent to the browser (Decimal -> number, Date -> ISO string).

export type ProductDTO = {
  id: string;
  name: string;
  price: number;
  /** Units left; null when the store doesn't track stock for this product. */
  stockQty: number | null;
  imageUrl: string | null;
  isActive: boolean;
  category: string;
  scheduledDeleteAt: string | null;
};

export type CustomerDTO = {
  id: string;
  name: string;
  phone: string;
  token: string;
  isActive: boolean;
  /** When a device first opened the link and became its only device (null = not opened yet). */
  deviceBoundAt: string | null;
  /** When the link closes (or closed) because the customer's order was finished; null = stays open. */
  linkClosesAt: string | null;
  scheduledDeleteAt: string | null;
  createdAt: string;
  orderCount: number;
};

export type PaymentDTO = {
  method: "CASH" | "UPI";
  amount: number;
  status: "PENDING" | "PAID";
  qrImageUrl: string | null;
  /** A UPI ID the store sent instead of, or with, the QR. */
  upiId: string | null;
  /** Bank details or any other payment note from the store. */
  payNote: string | null;
  confirmedAt: string | null;
  confirmedByName: string | null;
  /** Screenshots the customer sent as proof of a UPI payment, oldest first. */
  proofs: { id: string; url: string; createdAt: string }[];
};

export type OrderDTO = {
  id: string;
  number: number;
  status: OrderStatusValue;
  fulfilmentType: "DELIVERY" | "PICKUP";
  deliveryAddress: string | null;
  deliveryLat: number | null;
  deliveryLng: number | null;
  deliveryPartner: { id: string; name: string } | null;
  deliveredAt: string | null;
  /** Delivery charge included in `total` (0 for pickup or free delivery). */
  deliveryFee: number;
  /** When the customer confirmed they received the order. */
  receivedAt: string | null;
  scheduledDeleteAt: string | null;
  createdAt: string;
  total: number;
  /** id is null once the customer has been permanently deleted. */
  customer: { id: string | null; name: string; phone: string };
  items: {
    id: string;
    productName: string;
    qty: number;
    priceAtOrder: number;
  }[];
  payment: PaymentDTO | null;
};

export type AdminDTO = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SUPER_ADMIN" | "DELIVERY";
  isActive: boolean;
  createdAt: string;
  /** When their private sign-in link was last issued (null = no link). The link itself is never sent. */
  accessLinkAt: string | null;
};

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export function toProductDTO(p: Prisma.ProductGetPayload<object>): ProductDTO {
  return {
    id: p.id,
    name: p.name,
    price: Number(p.price),
    stockQty: p.stockQty,
    imageUrl: p.imageUrl,
    isActive: p.isActive,
    category: p.category,
    scheduledDeleteAt: iso(p.scheduledDeleteAt),
  };
}

export const customerInclude = {
  _count: { select: { orders: true } },
} satisfies Prisma.CustomerInclude;

export function toCustomerDTO(
  c: Prisma.CustomerGetPayload<{ include: typeof customerInclude }>,
): CustomerDTO {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    token: c.token,
    isActive: c.isActive,
    deviceBoundAt: c.deviceHash ? iso(c.deviceBoundAt) : null,
    linkClosesAt: iso(c.linkExpiresAt),
    scheduledDeleteAt: iso(c.scheduledDeleteAt),
    createdAt: c.createdAt.toISOString(),
    orderCount: c._count.orders,
  };
}

export const orderInclude = {
  deliveryPartner: { select: { id: true, name: true } },
  items: { orderBy: { id: "asc" } },
  payment: {
    include: {
      confirmedBy: { select: { name: true } },
      proofs: { orderBy: { createdAt: "asc" } },
    },
  },
} satisfies Prisma.OrderInclude;

export function toOrderDTO(
  o: Prisma.OrderGetPayload<{ include: typeof orderInclude }>,
): OrderDTO {
  const items = o.items.map((i) => ({
    id: i.id,
    productName: i.productName,
    qty: i.qty,
    priceAtOrder: Number(i.priceAtOrder),
  }));
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    fulfilmentType: o.fulfilmentType,
    deliveryAddress: o.deliveryAddress,
    deliveryLat: o.deliveryLat,
    deliveryLng: o.deliveryLng,
    deliveryPartner: o.deliveryPartner,
    deliveredAt: iso(o.deliveredAt),
    deliveryFee: Number(o.deliveryFee),
    receivedAt: iso(o.receivedAt),
    scheduledDeleteAt: iso(o.scheduledDeleteAt),
    createdAt: o.createdAt.toISOString(),
    total: o.payment
      ? Number(o.payment.amount)
      : items.reduce((s, i) => s + i.qty * i.priceAtOrder, 0) +
        Number(o.deliveryFee),
    customer: { id: o.customerId, name: o.customerName, phone: o.customerPhone },
    items,
    payment: o.payment
      ? {
          method: o.payment.method,
          amount: Number(o.payment.amount),
          status: o.payment.status,
          qrImageUrl: o.payment.qrImageUrl,
          upiId: o.payment.upiId,
          payNote: o.payment.payNote,
          confirmedAt: iso(o.payment.confirmedAt),
          confirmedByName: o.payment.confirmedBy?.name ?? null,
          proofs: o.payment.proofs.map((p) => ({
            id: p.id,
            url: p.imageUrl,
            createdAt: p.createdAt.toISOString(),
          })),
        }
      : null,
  };
}

export function toAdminDTO(a: Prisma.AdminGetPayload<object>): AdminDTO {
  return {
    id: a.id,
    name: a.name,
    email: a.email,
    role: a.role,
    isActive: a.isActive,
    createdAt: a.createdAt.toISOString(),
    accessLinkAt: a.accessTokenHash ? iso(a.accessTokenAt) : null,
  };
}
