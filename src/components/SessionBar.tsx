"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: "ADMIN" | "GOV_INSPECTOR" | "FIELD_OFFICER" | "PARTNER_STAFF" | "CONSUMER";
  organizationId: string | null;
  organizationName: string | null;
  consumerId: string | null;
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
        if (!body.user) {
          setLoading(false);
          router.replace("/login");
          return;
        }
        if (allowedRoles && !allowedRoles.includes(body.user.role)) {
          router.replace(HOME_BY_ROLE[body.user.role]);
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

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  if (!user) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12 }}>
      <span className="text-muted">
        {user.organizationName ? `${user.organizationName} · ` : ""}
        {user.displayName}
      </span>
      <button
        type="button"
        onClick={logout}
        className="btn btn-ghost"
        style={{ fontSize: 12, padding: "2px 8px" }}
      >
        로그아웃
      </button>
    </div>
  );
}
