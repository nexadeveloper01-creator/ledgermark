import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/cookie";

const PROTECTED = ["/console", "/partner", "/app", "/field", "/dev"];

// Flutter 등 별도 오리진에서 도는 클라이언트가 Bearer 토큰으로 API를 호출할 수 있도록
// 로컬 개발 오리진에 한해 CORS를 허용한다. 쿠키가 아니라 Authorization 헤더를 쓰므로
// 자격증명 없는 CORS(*는 아님, 오리진 반영)로 충분하다. 운영에서는 허용 오리진을 좁힌다.
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    const host = new URL(origin).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

function applyCors(res: NextResponse, origin: string | null) {
  if (origin && isAllowedOrigin(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Vary", "Origin");
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.headers.set("Access-Control-Max-Age", "86400");
  }
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get("origin");

  if (pathname.startsWith("/api/")) {
    if (req.method === "OPTIONS") {
      return applyCors(new NextResponse(null, { status: 204 }), origin);
    }
    return applyCors(NextResponse.next(), origin);
  }

  // 미들웨어는 Edge 런타임이라 DB를 조회할 수 없다. 여기서는 쿠키 유무만 보고
  // 로그인 화면으로 돌려보내는 UX 처리만 하며, 실제 권한 검사는 각 API 라우트에서 수행한다.
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
  matcher: [
    "/api/:path*",
    "/console/:path*",
    "/partner/:path*",
    "/app/:path*",
    "/field/:path*",
    "/dev/:path*",
  ],
};
