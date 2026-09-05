import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const alert = await prisma.smuggleAlert.update({
    where: { id: params.id },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });
  return NextResponse.json({ alert });
}
