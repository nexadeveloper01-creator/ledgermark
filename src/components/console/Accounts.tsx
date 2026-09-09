"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Corners } from "@/components/ui/Corners";
import { Tag } from "@/components/ui/Tag";
import { useT, type Dict } from "@/lib/i18n/web";

const ROLE_KEYS = ["ADMIN", "GOV_INSPECTOR", "FIELD_OFFICER", "PARTNER_STAFF", "CONSUMER"];

const D: Dict = {
  roleADMIN: { ko: "운영자", en: "Admin" },
  roleGOV_INSPECTOR: { ko: "심사관", en: "Inspector" },
  roleFIELD_OFFICER: { ko: "단속관", en: "Officer" },
  rolePARTNER_STAFF: { ko: "매장·총판", en: "Store staff" },
  roleCONSUMER: { ko: "소비자", en: "Consumer" },
  reqFail: { ko: "요청에 실패했습니다.", en: "Request failed." },
  createStaff: { ko: "직원 계정 생성", en: "Create staff account" },
  createAccount: { ko: "계정 생성", en: "Create account" },
  email: { ko: "이메일", en: "Email" },
  displayName: { ko: "표시 이름", en: "Display name" },
  roleOrg: { ko: "역할 · 소속", en: "Role · Org" },
  role: { ko: "역할", en: "Role" },
  memberOrg: { ko: "소속 기관", en: "Organization" },
  grantManager: { ko: "기관 관리자 권한 부여", en: "Grant org-manager rights" },
  pwNote: { ko: "비밀번호는 시스템이 생성하며 생성 직후 한 번만 표시됩니다. 저장되지 않으므로 즉시 전달하세요.", en: "The password is system-generated and shown only once right after creation. It is not stored — hand it over immediately." },
  tempPwTitle: { ko: "임시 비밀번호 — 이 화면을 벗어나면 다시 볼 수 없습니다", en: "Temporary password — you cannot see it again after leaving this screen" },
  confirmed: { ko: "확인했습니다", en: "Got it" },
  name: { ko: "이름", en: "Name" },
  org: { ko: "소속", en: "Org" },
  session: { ko: "세션", en: "Sessions" },
  status: { ko: "상태", en: "Status" },
  manage: { ko: "관리", en: "Manage" },
  orgManager: { ko: "기관 관리자", en: "Org manager" },
  inactive: { ko: "비활성", en: "Inactive" },
  activeLabel: { ko: "활성", en: "Active" },
  adminOnly: { ko: "운영자만 관리", en: "Admin only" },
  resetPw: { ko: "비밀번호 재발급", en: "Reset password" },
  endSessions: { ko: "세션 종료", en: "End sessions" },
  enable: { ko: "활성화", en: "Enable" },
  disable: { ko: "비활성화", en: "Disable" },
};

export function Accounts({
  currentUserId,
  scoped,
}: {
  currentUserId: string;
  /** 기관 관리자 화면 — 역할·소속이 본인과 동일하게 고정된다. */
  scoped?: { role: string; organizationId: string; organizationName: string };
}) {
  const t = useT(D);
  const [users, setUsers] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState(scoped?.role ?? "PARTNER_STAFF");
  const [organizationId, setOrganizationId] = useState(scoped?.organizationId ?? "");
  const [grantManager, setGrantManager] = useState(false);

  const load = useCallback(async () => {
    const u = await fetch("/api/admin/users").then((r) => r.json());
    setUsers(u.users ?? []);

    if (scoped) return;
    const o = await fetch("/api/organizations").then((r) => r.json());
    setOrgs(o.organizations ?? []);
    setOrganizationId((current) => current || o.organizations?.[0]?.id || "");
  }, [scoped]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (url: string, body?: unknown) => {
    setError(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? t("reqFail"));
      return null;
    }
    await load();
    return data;
  };

  const isConsumer = role === "CONSUMER";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div className="blueprint" style={{ padding: 18, background: "transparent" }}>
        <Corners />
        <div className="card-kicker">{scoped ? t("createStaff") : t("createAccount")}</div>
        <div
          style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginTop: 10 }}
        >
          <div className="field" style={{ minWidth: 200 }}>
            <label>{t("email")}</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field" style={{ minWidth: 150 }}>
            <label>{t("displayName")}</label>
            <input
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          {scoped ? (
            <div className="field" style={{ minWidth: 180 }}>
              <label>{t("roleOrg")}</label>
              <div className="input" style={{ display: "flex", alignItems: "center" }}>
                {t(`role${role}`)} · {scoped.organizationName}
              </div>
            </div>
          ) : (
            <div className="field" style={{ minWidth: 140 }}>
              <label>{t("role")}</label>
              <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLE_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {t(`role${k}`)}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!scoped && !isConsumer && (
            <div className="field" style={{ minWidth: 200 }}>
              <label>{t("memberOrg")}</label>
              <select
                className="input"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!scoped && !isConsumer && (
            <label className="radio" style={{ marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={grantManager}
                onChange={(e) => setGrantManager(e.target.checked)}
              />
              <span
                className="dot"
                style={{
                  borderRadius: 0,
                  background: grantManager ? "var(--color-accent)" : undefined,
                  borderColor: grantManager ? "var(--color-accent)" : undefined,
                }}
              />
              {t("grantManager")}
            </label>
          )}
          <Button
            variant="primary"
            onClick={async () => {
              const data = await act("/api/admin/users", {
                email,
                displayName,
                role,
                organizationId: isConsumer ? null : organizationId,
                isOrgManager: !scoped && !isConsumer && grantManager,
              });
              if (data) {
                setIssued({ email: data.user.email, password: data.tempPassword });
                setEmail("");
                setDisplayName("");
                setGrantManager(false);
              }
            }}
          >
            {t("createAccount")}
          </Button>
        </div>
        <div style={{ fontSize: 11, marginTop: 10 }} className="text-muted">
          {t("pwNote")}
        </div>
      </div>

      {issued && (
        <div
          className="blueprint"
          style={{
            padding: 16,
            background: "var(--color-accent-100)",
            borderColor: "var(--color-accent-400)",
          }}
        >
          <Corners />
          <div className="card-kicker">{t("tempPwTitle")}</div>
          <div style={{ marginTop: 8, fontSize: 14 }}>
            <strong>{issued.email}</strong>
          </div>
          <div
            style={{
              fontFamily: "ui-monospace, Menlo, monospace",
              fontSize: 18,
              marginTop: 6,
              wordBreak: "break-all",
            }}
          >
            {issued.password}
          </div>
          <Button variant="secondary" style={{ marginTop: 12 }} onClick={() => setIssued(null)}>
            {t("confirmed")}
          </Button>
        </div>
      )}

      {error && <p style={{ color: "var(--color-accent-700)", fontSize: 13 }}>{error}</p>}

      <table className="table">
        <thead>
          <tr>
            <th>{t("email")}</th>
            <th>{t("name")}</th>
            <th>{t("role")}</th>
            <th>{t("org")}</th>
            <th>{t("session")}</th>
            <th>{t("status")}</th>
            <th>{t("manage")}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            // 기관 관리자는 다른 관리자 계정을 다룰 수 없다 — 오류가 나는 버튼을 아예 숨긴다.
            const manageable = !scoped || !u.isOrgManager;
            return (
            <tr key={u.id}>
              <td style={{ fontSize: 12 }}>{u.email}</td>
              <td style={{ fontSize: 12 }}>{u.displayName}</td>
              <td style={{ fontSize: 12 }}>
                {t(`role${u.role}`)}
                {u.isOrgManager && (
                  <span className="text-muted" style={{ marginLeft: 6, fontSize: 10 }}>
                    {t("orgManager")}
                  </span>
                )}
              </td>
              <td style={{ fontSize: 12 }}>{u.organization?.name ?? "—"}</td>
              <td style={{ fontSize: 12 }}>{u._count.sessions}</td>
              <td>
                <Tag variant={u.disabledAt ? "neutral" : "accent"}>
                  {u.disabledAt ? t("inactive") : t("activeLabel")}
                </Tag>
              </td>
              <td>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {!manageable && (
                    <span className="text-muted" style={{ fontSize: 11 }}>
                      {t("adminOnly")}
                    </span>
                  )}
                  {manageable && <Button
                    variant="ghost"
                    style={{ fontSize: 11 }}
                    onClick={async () => {
                      const data = await act(`/api/admin/users/${u.id}/password`);
                      if (data) setIssued({ email: u.email, password: data.tempPassword });
                    }}
                  >
                    {t("resetPw")}
                  </Button>}
                  {manageable && u._count.sessions > 0 && (
                    <Button
                      variant="ghost"
                      style={{ fontSize: 11 }}
                      onClick={() => act(`/api/admin/users/${u.id}/revoke-sessions`)}
                    >
                      {t("endSessions")}
                    </Button>
                  )}
                  {manageable && u.id !== currentUserId && (
                    <Button
                      variant="ghost"
                      style={{ fontSize: 11 }}
                      onClick={() =>
                        act(`/api/admin/users/${u.id}/status`, { disabled: !u.disabledAt })
                      }
                    >
                      {u.disabledAt ? t("enable") : t("disable")}
                    </Button>
                  )}
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
