import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { toAdminDTO } from "@/lib/dto";

const CreateAdminSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200),
  role: z.enum(["ADMIN", "SUPER_ADMIN", "DELIVERY"]).default("ADMIN"),
});

/** POST /api/superadmin/admins — create a staff account (the list is GET /api/admin/team). */
export async function POST(req: Request) {
  const auth = await requireAdminApi({ superOnly: true });
  if (!auth.ok) return auth.res;
  const body = await parseJson(req, CreateAdminSchema);
  if (!body.ok) return body.res;
  const { name, email, password, role } = body.data;

  if (await prisma.admin.findUnique({ where: { email } })) {
    return jsonError("An account with this email already exists", 409);
  }
  const admin = await prisma.admin.create({
    data: { name, email, role, passwordHash: await bcrypt.hash(password, 10) },
  });
  await audit(auth.admin.id, "created_admin", admin.id, `${role} ${email}`);
  return NextResponse.json(toAdminDTO(admin), { status: 201 });
}
