import { NextResponse } from "next/server";
import { assertActsForOrg, authErrorResponse, requireRole } from "@/lib/auth/guards";
import { rejectRequest } from "@/lib/requests/transferRequestService";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("PARTNER_STAFF", "ADMIN");

    const request = await prisma.transferRequest.findUnique({
      where: { id: params.id },
      include: { uid: true },
    });
    if (!request) {
      return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
    }
    if (request.uid.ownerType === "ORG") {
      assertActsForOrg(user, request.uid.ownerOrgId);
    }

    const rejected = await rejectRequest(params.id);
    return NextResponse.json({ request: rejected });
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;
    throw err;
  }
}
