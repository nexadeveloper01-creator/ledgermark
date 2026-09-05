import { NextResponse } from "next/server";
import { rejectRequest } from "@/lib/requests/transferRequestService";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const request = await rejectRequest(params.id);
  return NextResponse.json({ request });
}
