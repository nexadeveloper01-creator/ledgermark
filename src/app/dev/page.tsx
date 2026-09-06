"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Corners } from "@/components/ui/Corners";
import { Tag } from "@/components/ui/Tag";
import { SessionBar, useSession, HOME_BY_ROLE } from "@/components/SessionBar";

const SURFACES = [
  { href: "/", label: "랜딩 페이지", en: "LANDING" },
  { href: "/console", label: "정부 관제 콘솔", en: "CONSOLE" },
  { href: "/partner", label: "매장·총판 웹", en: "PARTNER" },
  { href: "/app", label: "소비자 앱", en: "CONSUMER APP" },
  { href: "/field", label: "단속 현장 단말", en: "FIELD" },
  { href: "/signup", label: "소비자 가입", en: "SIGNUP" },
];

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "운영자",
  GOV_INSPECTOR: "심사관",
  FIELD_OFFICER: "단속관",
  PARTNER_STAFF: "매장·총판",
  CONSUMER: "소비자",
};

export default function DevPage() {
  const { user, loading } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>(null);

  // 개발자 세션이 아니면 자기 역할 홈으로 돌려보낸다 (서버 API는 별도로 다시 검사).
  useEffect(() => {
    if (!loading && user && !user.isDeveloper) {
      router.replace(HOME_BY_ROLE[user.role]);
    }
  }, [loading, user, router]);

  const load = useCallback(async () => {
    const [u, k] = await Promise.all([
      fetch("/api/admin/users").then((r) => (r.ok ? r.json() : { users: [] })),
      fetch("/api/console/kpis").then((r) => (r.ok ? r.json() : null)),
    ]);
    setUsers(u.users ?? []);
    setKpis(k);
  }, []);

  useEffect(() => {
    if (user?.isDeveloper) load();
  }, [user, load]);

  if (loading || !user || !user.isDeveloper) {
    return (
      <p className="text-muted" style={{ padding: 32 }}>
        불러오는 중...
      </p>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <div
        className="nav"
        style={{ borderBottom: "1px solid var(--color-divider)", padding: "0 32px", height: 64, gap: 18 }}
      >
        <span className="nav-brand" style={{ fontSize: 17, letterSpacing: "0.12em" }}>
          LEDGERMARK
        </span>
        <span
          style={{
            fontSize: 11,
            letterSpacing: "0.14em",
            color: "var(--color-bg)",
            background: "var(--color-accent-900)",
            padding: "2px 8px",
          }}
        >
          DEVELOPER MODE
        </span>
        <div style={{ marginLeft: "auto" }}>
          <SessionBar user={user} />
        </div>
      </div>

      <div style={{ padding: "32px", maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
        <div>
          <h2 style={{ fontSize: 28, margin: "0 0 6px" }}>개발자 대시보드</h2>
          <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }} className="text-muted">
            {user.email} · 모든 화면과 시스템 상태를 한 곳에서 확인합니다. 이 진입점은
            DEVELOPER_EMAILS 환경변수로 제어되며 운영 배포에서는 비활성화해야 합니다.
          </p>
        </div>

        <div>
          <h3 style={{ fontSize: 17, marginBottom: 12 }}>화면 바로가기</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            {SURFACES.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="blueprint"
                style={{ padding: 16, background: "transparent", color: "var(--color-text)", display: "block" }}
              >
                <Corners />
                <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--color-accent-700)" }}>
                  {s.en}
                </div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 18, marginTop: 4 }}>
                  {s.label}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {kpis && (
          <div>
            <h3 style={{ fontSize: 17, marginBottom: 12 }}>시스템 상태</h3>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Tag variant="accent">전체 UID {kpis.totalUids?.toLocaleString?.() ?? kpis.totalUids}</Tag>
              <Tag variant={kpis.openAlerts > 0 ? "accent" : "neutral"}>열린 알림 {kpis.openAlerts}</Tag>
              <Tag variant={kpis.ledgerIntegrity?.valid ? "accent" : "neutral"}>
                원장 무결성 {kpis.ledgerIntegrity?.valid ? "정상" : "이상"}
              </Tag>
              <Tag variant="neutral">
                최근 앵커 {kpis.lastAnchor ? new Date(kpis.lastAnchor.createdAt).toLocaleString("ko-KR") : "없음"}
              </Tag>
            </div>
          </div>
        )}

        <div>
          <h3 style={{ fontSize: 17, marginBottom: 12 }}>데모 계정 ({users.length})</h3>
          <table className="table">
            <thead>
              <tr>
                <th>이메일</th>
                <th>이름</th>
                <th>역할</th>
                <th>소속</th>
                <th>이메일 인증</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontSize: 12 }}>{u.email}</td>
                  <td style={{ fontSize: 12 }}>{u.displayName}</td>
                  <td style={{ fontSize: 12 }}>{ROLE_LABEL[u.role] ?? u.role}</td>
                  <td style={{ fontSize: 12 }}>{u.organization?.name ?? "—"}</td>
                  <td style={{ fontSize: 12 }}>{u.emailVerifiedAt ? "완료" : "미인증"}</td>
                  <td>
                    <Tag variant={u.disabledAt ? "neutral" : "accent"}>
                      {u.disabledAt ? "비활성" : "활성"}
                    </Tag>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 11, marginTop: 8 }} className="text-muted">
            데모 계정 비밀번호는 모두 <code>ledgermark1234</code> 입니다.
          </p>
        </div>
      </div>
    </div>
  );
}
