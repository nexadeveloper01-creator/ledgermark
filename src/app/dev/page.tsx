"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Corners } from "@/components/ui/Corners";
import { Tag } from "@/components/ui/Tag";
import { SessionBar, useSession, HOME_BY_ROLE } from "@/components/SessionBar";

import { useT, type Dict } from "@/lib/i18n/web";

function navKeyFor(href: string) {
  return (
    { "/": "navLanding", "/console": "navConsole", "/partner": "navPartner", "/app": "navApp", "/field": "navField" } as Record<string, string>
  )[href] ?? href;
}

const D: Dict = {
  loading: { ko: "불러오는 중...", en: "Loading..." },
  h: { ko: "개발자 대시보드", en: "Developer dashboard" },
  sub: { ko: "모든 화면과 시스템 상태를 한 곳에서 확인합니다. 이 진입점은 DEVELOPER_EMAILS 환경변수로 제어되며 운영 배포에서는 비활성화해야 합니다.", en: "All surfaces and system status in one place. This entry point is gated by DEVELOPER_EMAILS and must be disabled in production." },
  shortcuts: { ko: "화면 바로가기", en: "Surface shortcuts" },
  sysStatus: { ko: "시스템 상태", en: "System status" },
  totalUid: { ko: "전체 UID", en: "Total UIDs" },
  openAlerts: { ko: "열린 알림", en: "Open alerts" },
  integrity: { ko: "원장 무결성", en: "Ledger integrity" },
  ok: { ko: "정상", en: "OK" },
  bad: { ko: "이상", en: "Anomaly" },
  lastAnchor: { ko: "최근 앵커", en: "Last anchor" },
  none: { ko: "없음", en: "None" },
  demoAccounts: { ko: "데모 계정", en: "Demo accounts" },
  email: { ko: "이메일", en: "Email" },
  name: { ko: "이름", en: "Name" },
  role: { ko: "역할", en: "Role" },
  org: { ko: "소속", en: "Org" },
  emailVerify: { ko: "이메일 인증", en: "Email verified" },
  status: { ko: "상태", en: "Status" },
  verified: { ko: "완료", en: "Yes" },
  unverified: { ko: "미인증", en: "No" },
  disabled: { ko: "비활성", en: "Disabled" },
  active: { ko: "활성", en: "Active" },
  pwNote1: { ko: "데모 계정 비밀번호는 모두", en: "All demo account passwords are" },
  pwNote2: { ko: "입니다.", en: "." },
  navLanding: { ko: "랜딩 페이지", en: "Landing" },
  navConsole: { ko: "정부 관제 콘솔", en: "Government console" },
  navPartner: { ko: "매장·총판 웹", en: "Store / distributor" },
  navApp: { ko: "소비자 앱", en: "Consumer app" },
  navField: { ko: "단속 현장 단말", en: "Field terminal" },
  roleADMIN: { ko: "운영자", en: "Admin" },
  roleGOV_INSPECTOR: { ko: "심사관", en: "Inspector" },
  roleFIELD_OFFICER: { ko: "단속관", en: "Officer" },
  rolePARTNER_STAFF: { ko: "매장·총판", en: "Store staff" },
  roleCONSUMER: { ko: "소비자", en: "Consumer" },
};

const SURFACES = [
  { href: "/", label: "랜딩 페이지", en: "LANDING" },
  { href: "/console", label: "정부 관제 콘솔", en: "CONSOLE" },
  { href: "/partner", label: "매장·총판 웹", en: "PARTNER" },
  { href: "/app", label: "소비자 앱", en: "CONSUMER APP" },
  { href: "/field", label: "단속 현장 단말", en: "FIELD" },
];

export default function DevPage() {
  const t = useT(D);
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
        {t("loading")}
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
          <h2 style={{ fontSize: 28, margin: "0 0 6px" }}>{t("h")}</h2>
          <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }} className="text-muted">
            {user.email} · {t("sub")}
          </p>
        </div>

        <div>
          <h3 style={{ fontSize: 17, marginBottom: 12 }}>{t("shortcuts")}</h3>
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
                  {t(navKeyFor(s.href))}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {kpis && (
          <div>
            <h3 style={{ fontSize: 17, marginBottom: 12 }}>{t("sysStatus")}</h3>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Tag variant="accent">{t("totalUid")} {kpis.totalUids?.toLocaleString?.() ?? kpis.totalUids}</Tag>
              <Tag variant={kpis.openAlerts > 0 ? "accent" : "neutral"}>{t("openAlerts")} {kpis.openAlerts}</Tag>
              <Tag variant={kpis.ledgerIntegrity?.valid ? "accent" : "neutral"}>
                {t("integrity")} {kpis.ledgerIntegrity?.valid ? t("ok") : t("bad")}
              </Tag>
              <Tag variant="neutral">
                {t("lastAnchor")} {kpis.lastAnchor ? new Date(kpis.lastAnchor.createdAt).toLocaleString() : t("none")}
              </Tag>
            </div>
          </div>
        )}

        <div>
          <h3 style={{ fontSize: 17, marginBottom: 12 }}>{t("demoAccounts")} ({users.length})</h3>
          <table className="table">
            <thead>
              <tr>
                <th>{t("email")}</th>
                <th>{t("name")}</th>
                <th>{t("role")}</th>
                <th>{t("org")}</th>
                <th>{t("emailVerify")}</th>
                <th>{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontSize: 12 }}>{u.email}</td>
                  <td style={{ fontSize: 12 }}>{u.displayName}</td>
                  <td style={{ fontSize: 12 }}>{t(`role${u.role}`)}</td>
                  <td style={{ fontSize: 12 }}>{u.organization?.name ?? "—"}</td>
                  <td style={{ fontSize: 12 }}>{u.emailVerifiedAt ? t("verified") : t("unverified")}</td>
                  <td>
                    <Tag variant={u.disabledAt ? "neutral" : "accent"}>
                      {u.disabledAt ? t("disabled") : t("active")}
                    </Tag>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 11, marginTop: 8 }} className="text-muted">
            {t("pwNote1")} <code>ledgermark1234</code>{t("pwNote2")}
          </p>
        </div>
      </div>
    </div>
  );
}
