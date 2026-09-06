import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/cookie";

const PROTECTED = ["/console", "/partner", "/app", "/field", "/dev"];

// 미들웨어는 Edge 런타임이라 DB를 조회할 수 없다. 여기서는 쿠키 유무만 보고
// 로그인 화면으로 돌려보내는 UX 처리만 하며, 실제 권한 검사는 각 API 라우트에서 수행한다.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  if (req.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/console/:path*", "/partner/:path*", "/app/:path*", "/field/:path*", "/dev/:path*"],
};
