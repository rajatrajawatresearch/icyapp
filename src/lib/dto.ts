import type { Prisma } from "@prisma/client";
import type { OrderStatusValue } from "./constants";

// Plain JSON shapes sent to the browser (Decimal -> number, Date -> ISO string).

export type ProductDTO = {
  id: string;
  name: string;
  price: number;
  stockQty: number;
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
  scheduledDeleteAt: string | null;
  createdAt: string;
  orderCount: number;
};

export type PaymentDTO = {
  method: "CASH" | "UPI";
  amount: number;
  status: "PENDING" | "PAID";
  qrImageUrl: string | null;
  confirmedAt: string | null;
  confirmedByName: string | null;
};

export type OrderDTO = {
  id: string;
  number: number;
  status: OrderStatusValue;
  fulfilmentType: "DELIVERY" | "PICKUP";
  deliveryAddress: string | null;
  deliveryLat: number | null;
  deliveryLng: number | null;
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
  role: "ADMIN" | "SUPER_ADMIN";
  isActive: boolean;
  createdAt: string;
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
    scheduledDeleteAt: iso(c.scheduledDeleteAt),
    createdAt: c.createdAt.toISOString(),
    orderCount: c._count.orders,
  };
}

export const orderInclude = {
  items: { orderBy: { id: "asc" } },
  payment: { include: { confirmedBy: { select: { name: true } } } },
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
    scheduledDeleteAt: iso(o.scheduledDeleteAt),
    createdAt: o.createdAt.toISOString(),
    total: o.payment
      ? Number(o.payment.amount)
      : items.reduce((s, i) => s + i.qty * i.priceAtOrder, 0),
    customer: { id: o.customerId, name: o.customerName, phone: o.customerPhone },
    items,
    payment: o.payment
      ? {
          method: o.payment.method,
          amount: Number(o.payment.amount),
          status: o.payment.status,
          qrImageUrl: o.payment.qrImageUrl,
          confirmedAt: iso(o.payment.confirmedAt),
          confirmedByName: o.payment.confirmedBy?.name ?? null,
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
  };
}
