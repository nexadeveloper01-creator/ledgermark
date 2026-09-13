"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useT, type Dict } from "@/lib/i18n/web";

const SB: Dict = { "sb.logout": { ko: "로그아웃", en: "Sign out", fil: "Mag-sign out" } };

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: "ADMIN" | "GOV_INSPECTOR" | "FIELD_OFFICER" | "PARTNER_STAFF" | "CONSUMER";
  organizationId: string | null;
  organizationName: string | null;
  organizationType: string | null;
  consumerId: string | null;
  isOrgManager: boolean;
  emailVerified: boolean;
  isDeveloper: boolean;
}

export const HOME_BY_ROLE: Record<SessionUser["role"], string> = {
  ADMIN: "/console",
  GOV_INSPECTOR: "/console",
  FIELD_OFFICER: "/field",
  PARTNER_STAFF: "/partner",
  CONSUMER: "/app",
};

// allowedRoles를 넘기면 권한이 없는 계정을 자기 역할의 홈으로 돌려보낸다.
// 서버 측 권한 검사와 별개인 UX 처리로, 접근 자체는 API에서 다시 차단된다.
export function useSession(allowedRoles?: SessionUser["role"][]) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((body: { user: SessionUser | null }) => {
        const path = typeof window !== "undefined" ? window.location.pathname : "/";
        if (!body.user) {
          setLoading(false);
          router.replace(`/login?next=${encodeURIComponent(path)}`);
          return;
        }
        if (allowedRoles && !allowedRoles.includes(body.user.role)) {
          // 권한이 다른 화면이면 "다른 앱"으로 보내지 않는다(예: admin이 소비자 앱을 열면
          // 콘솔로 튕기던 문제). 대신 이 화면에 맞는 계정으로 갈아탈 수 있는 전환 로그인으로 보낸다.
          router.replace(`/login?next=${encodeURIComponent(path)}&switch=1`);
          return;
        }
        setUser(body.user);
        setLoading(false);
      });
    // allowedRoles는 각 화면에서 리터럴로 넘기므로 참조가 매번 바뀐다 — 내용으로 비교한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, allowedRoles?.join(",")]);

  return { user, loading };
}

export function SessionBar({ user }: { user: SessionUser | null }) {
  const router = useRouter();
  const t = useT(SB);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    // 명시적 로그아웃 시에는 저장된 자동 로그인 정보를 지워 계정 전환을 허용한다.
    try {
      window.localStorage.removeItem("lm_saved_login");
    } catch {
      /* localStorage 접근 불가 환경 무시 */
    }
    router.replace("/login");
    router.refresh();
  };

  if (!user) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12 }}>
      <span className="text-muted" style={{ whiteSpace: "nowrap" }}>
        {user.organizationName ? `${user.organizationName} · ` : ""}
        {user.displayName}
      </span>
      <button
        type="button"
        onClick={logout}
        className="btn btn-ghost"
        style={{ fontSize: 12, padding: "2px 8px" }}
      >
        {t("sb.logout")}
      </button>
    </div>
  );
}
