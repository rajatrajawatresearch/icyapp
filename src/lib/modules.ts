// Shared between server and client code — keep free of server-only imports.

/**
 * The sections of the store panel a super admin can hand to an admin, one by
 * one. Settings, the audit log and deleting are never on this list: they stay
 * with the super admin.
 */
export const MODULES = [
  { id: "orders", label: "Orders", home: "/admin/orders" },
  { id: "products", label: "Products", home: "/admin/products" },
  { id: "customers", label: "Customers", home: "/admin/customers" },
  { id: "delivery", label: "Delivery team", home: "/admin/riders" },
  { id: "reports", label: "Reports", home: "/admin/reports" },
] as const;

export type ModuleId = (typeof MODULES)[number]["id"];
export const MODULE_IDS = MODULES.map((m) => m.id) as [ModuleId, ...ModuleId[]];

type Account = { role: "ADMIN" | "SUPER_ADMIN" | "DELIVERY"; modules: string[] };

/** May this account open this section? */
export function canUse(account: Account, module: ModuleId) {
  if (account.role === "SUPER_ADMIN") return true;
  return account.role === "ADMIN" && account.modules.includes(module);
}

/** Where an account lands after signing in: its first section, or its own account page. */
export function homePathFor(account: Account) {
  if (account.role === "DELIVERY") return "/delivery";
  return MODULES.find((m) => canUse(account, m.id))?.home ?? "/admin/account";
}
