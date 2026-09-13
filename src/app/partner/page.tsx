"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Corners } from "@/components/ui/Corners";
import { SessionBar, useSession } from "@/components/SessionBar";
import { Accounts } from "@/components/console/Accounts";
import { Checkout } from "@/components/partner/Checkout";
import { ExchangeStats } from "@/components/console/ExchangeStats";
import { useT, LangToggle, type Dict } from "@/lib/i18n/web";

const D: Dict = {
  loading: { ko: "불러오는 중...", en: "Loading..." },
  tabQueue: { ko: "소유권 이전 큐", en: "Transfer queue" },
  tabCheckout: { ko: "매장 결제", en: "Checkout" },
  tabStaff: { ko: "직원 관리", en: "Staff" },
  tabExchanges: { ko: "하자·교환", en: "Defects & exchanges" },
  landing: { ko: "랜딩", en: "Landing", fil: "Landing" },
  navBadgeDist: { ko: "총판", en: "DISTRIBUTOR", fil: "DISTRIBUTOR" },
  navBadgeRetail: { ko: "소매점", en: "RETAIL", fil: "RETAIL" },
  orgFallback: { ko: "소속 기관", en: "Your organization" },
  queueTitle: { ko: "소유권 이전 대기 큐", en: "Transfer queue" },
  thRequest: { ko: "요청", en: "Request" },
  thApplicant: { ko: "신청자", en: "Requester" },
  thStatus: { ko: "상태", en: "Status" },
  noRequests: { ko: "대기 중인 요청이 없습니다.", en: "No pending requests." },
  blocked: { ko: "판매 차단", en: "Sale blocked" },
  jProduct: { ko: "제품", en: "Product" },
  jCurStatus: { ko: "현재 상태", en: "Current status" },
  jPrevOwner: { ko: "이전 소유자", en: "Previous owner" },
  jNewOwner: { ko: "신규 소유자", en: "New owner" },
  jAge: { ko: "연령인증", en: "Age check" },
  ageDone: { ko: "앱 인증 완료", en: "Verified in app" },
  ageNone: { ko: "미완료", en: "Not verified" },
  jVoucher: { ko: "교환권", en: "Voucher" },
  voucherSpend: { ko: "소진 예정", en: "will be spent" },
  commit: { ko: "커밋", en: "Commit" },
  hold: { ko: "보류", en: "Hold" },
  blockedNote: { ko: "관제 콘솔로 밀수 의심 알림이 전송되었습니다.", en: "A smuggling alert was escalated to the console." },
  msgCommitted: { ko: "원장에 소유권 이전 트랜잭션이 기록되었습니다.", en: "Ownership transfer recorded on the ledger." },
  msgRejected: { ko: "요청을 반려했습니다.", en: "Request rejected." },
  ptype_RETAIL_SALE: { ko: "소매 판매 처리", en: "Retail sale" },
  ptype_EXCHANGE_TRANSFER: { ko: "불량 교환 처리", en: "Defect exchange" },
  ptype_WHOLESALE_TRANSFER: { ko: "총판 배분", en: "Wholesale allocation" },
  pcta_RETAIL_SALE: { ko: "소유권 이전 / COMMIT", en: "Commit transfer" },
  pcta_EXCHANGE_TRANSFER: { ko: "교환 승인 / COMMIT", en: "Approve exchange" },
  pcta_WHOLESALE_TRANSFER: { ko: "일괄 이전 / COMMIT", en: "Commit batch" },
  pnote_RETAIL_SALE: { ko: "커밋 시 RETAIL_SALE 트랜잭션이 원장에 기록되고 다음 앵커링에 포함됩니다.", en: "On commit, a RETAIL_SALE transaction is recorded and included in the next anchor." },
  pnote_EXCHANGE_TRANSFER: { ko: "기존 교환권은 소진되고 신규 UID는 동일 소유자에게 귀속됩니다.", en: "The existing voucher is spent and a new UID is issued to the same owner." },
  pnote_WHOLESALE_TRANSFER: { ko: "LOT 단위 배분도 UID별 소유권 이전 트랜잭션으로 원장에 기록됩니다.", en: "Batch allocation is recorded as per-UID ownership transfers." },
  pstate_PENDING: { ko: "처리 대기", en: "Pending" },
  pstate_COMMITTED: { ko: "이전 완료", en: "Committed" },
  pstate_BLOCKED: { ko: "판매 차단", en: "Blocked" },
  pstate_REJECTED: { ko: "반려됨", en: "Rejected" },
};

const TYPE_EN: Record<string, string> = {
  RETAIL_SALE: "RETAIL SALE",
  EXCHANGE_TRANSFER: "EXCHANGE",
  WHOLESALE_TRANSFER: "WHOLESALE",
};

export default function PartnerPage() {
  const t = useT(D);
  const { user, loading } = useSession(["PARTNER_STAFF", "ADMIN"]);
  const [tab, setTab] = useState<"queue" | "checkout" | "staff">("queue");
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/requests");
    const body = await res.json();
    const list = body.requests ?? [];
    setRequests(list);
    setSelectedId((current) => current ?? list[0]?.id ?? null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selected = requests.find((r) => r.id === selectedId) ?? null;

  if (loading || !user) {
    return (
      <p className="text-muted" style={{ padding: 32 }}>
        {t("loading")}
      </p>
    );
  }

  // 총판(코니아랩 제품 독점판매 유통사)은 하자·교환 현황을 본다. 소매점과 화면이 다르다.
  if (user.organizationType === "DISTRIBUTOR") {
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
              color: "var(--color-accent-700)",
              border: "1px solid var(--color-divider)",
              padding: "2px 8px",
            }}
          >
            {t("navBadgeDist")}
          </span>
          <div className="seg" style={{ marginLeft: 12 }}>
            <label className="seg-opt">
              <input
                type="radio"
                name="dist-tab"
                checked={tab !== "staff"}
                onChange={() => setTab("queue")}
              />
              {t("tabExchanges")}
            </label>
            {user.isOrgManager && (
              <label className="seg-opt">
                <input
                  type="radio"
                  name="dist-tab"
                  checked={tab === "staff"}
                  onChange={() => setTab("staff")}
                />
                {t("tabStaff")}
              </label>
            )}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <LangToggle />
            <SessionBar user={user} />
            <Link href="/" style={{ fontSize: 13 }}>
              {t("landing")}
            </Link>
          </div>
        </div>

        <div style={{ padding: 32, maxWidth: 1200, margin: "0 auto" }}>
          {tab === "staff" && user.isOrgManager && user.organizationId ? (
            <Accounts
              currentUserId={user.id}
              scoped={{
                role: user.role,
                organizationId: user.organizationId,
                organizationName: user.organizationName ?? t("orgFallback"),
              }}
            />
          ) : (
            <ExchangeStats />
          )}
        </div>
      </div>
    );
  }

  const commit = async () => {
    if (!selected) return;
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/requests/${selected.id}/commit`, { method: "POST" });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error);
      return;
    }
    setMessage(t("msgCommitted"));
    load();
  };

  const reject = async () => {
    if (!selected) return;
    setError(null);
    setMessage(null);
    await fetch(`/api/requests/${selected.id}/reject`, { method: "POST" });
    setMessage(t("msgRejected"));
    load();
  };

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
            color: "var(--color-accent-700)",
            border: "1px solid var(--color-divider)",
            padding: "2px 8px",
          }}
        >
          {t("navBadgeRetail")}
        </span>
        <div className="seg" style={{ marginLeft: 12 }}>
          <label className="seg-opt">
            <input
              type="radio"
              name="partner-tab"
              checked={tab === "queue"}
              onChange={() => setTab("queue")}
            />
            {t("tabQueue")}
          </label>
          <label className="seg-opt">
            <input
              type="radio"
              name="partner-tab"
              checked={tab === "checkout"}
              onChange={() => setTab("checkout")}
            />
            {t("tabCheckout")}
          </label>
          {user.isOrgManager && (
            <label className="seg-opt">
              <input
                type="radio"
                name="partner-tab"
                checked={tab === "staff"}
                onChange={() => setTab("staff")}
              />
              {t("tabStaff")}
            </label>
          )}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <LangToggle />
          <SessionBar user={user} />
          <Link href="/" style={{ fontSize: 13 }}>
            {t("landing")}
          </Link>
        </div>
      </div>

      {/* 소매점 화면: 판매 인증 → 소비자 이전 = 교환권 1회 부여 흐름 */}
      {tab === "staff" && user.isOrgManager && user.organizationId && (
        <div style={{ padding: 32, maxWidth: 1200, margin: "0 auto" }}>
          <Accounts
            currentUserId={user.id}
            scoped={{
              role: user.role,
              organizationId: user.organizationId,
              organizationName: user.organizationName ?? t("orgFallback"),
            }}
          />
        </div>
      )}

      {tab === "checkout" && (
        <div style={{ padding: 32, maxWidth: 1200, margin: "0 auto" }}>
          <Checkout />
        </div>
      )}

      <div
        style={{
          display: tab === "queue" ? "grid" : "none",
          padding: 32,
          maxWidth: 1400,
          margin: "0 auto",
          gridTemplateColumns: "minmax(0, 1.45fr) minmax(340px, 1fr)",
          gap: 44,
          alignItems: "start",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 17 }}>{t("queueTitle")}</h3>
            <span style={{ fontSize: 10, letterSpacing: "0.14em" }} className="text-muted">
              TRANSFER QUEUE
            </span>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>UID</th>
                <th>{t("thRequest")}</th>
                <th>{t("thApplicant")}</th>
                <th>{t("thStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  style={{
                    cursor: "pointer",
                    borderLeft: `3px solid ${r.id === selectedId ? "var(--color-accent)" : "transparent"}`,
                    background: r.id === selectedId ? "var(--color-accent-100)" : undefined,
                  }}
                >
                  <td style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, whiteSpace: "nowrap" }}>
                    {r.uid.code}
                  </td>
                  <td style={{ fontSize: 11, letterSpacing: "0.06em", color: "var(--color-accent-700)" }}>
                    {r.type}
                  </td>
                  <td style={{ fontSize: 12 }}>{r.requestedConsumer?.displayName ?? r.toOrg?.name ?? "—"}</td>
                  <td>
                    <span className="tag tag-outline" style={{ fontSize: 10, whiteSpace: "nowrap" }}>
                      {t(`pstate_${r.status}`)}
                    </span>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-muted">
                    {t("noRequests")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="blueprint" style={{ padding: 22, background: "transparent" }}>
            <Corners />
            <div className="card-kicker">
              {selected.status === "BLOCKED" ? "BLOCKED" : TYPE_EN[selected.type]}
            </div>
            <h3 style={{ fontSize: 21, margin: "5px 0 4px" }}>
              {selected.status === "BLOCKED" ? t("blocked") : t(`ptype_${selected.type}`)}
            </h3>
            <div
              style={{
                fontFamily: "ui-monospace, Menlo, monospace",
                fontSize: 13,
                marginBottom: 16,
                color: "var(--color-accent-700)",
                wordBreak: "break-all",
              }}
            >
              {selected.uid.code}
            </div>

            <JobRow k={t("jProduct")} v={selected.uid.lot?.productName ?? "—"} />
            <JobRow k={t("jCurStatus")} v={selected.uid.status} />
            <JobRow k={t("jPrevOwner")} v={selected.fromOrg?.name ?? "—"} />
            <JobRow
              k={t("jNewOwner")}
              v={selected.requestedConsumer?.displayName ?? selected.toOrg?.name ?? "—"}
            />
            {selected.type === "RETAIL_SALE" && (
              <JobRow k={t("jAge")} v={selected.ageVerified ? t("ageDone") : t("ageNone")} />
            )}
            {selected.type === "EXCHANGE_TRANSFER" && (
              <JobRow k={t("jVoucher")} v={`${selected.uid.voucherState} · ${t("voucherSpend")}`} />
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <Button
                variant="primary"
                className="blueprint"
                style={{ flex: 1, height: 44 }}
                disabled={selected.status !== "PENDING"}
                onClick={commit}
              >
                <Corners />
                {selected.type ? t(`pcta_${selected.type}`) : t("commit")}
              </Button>
              <Button
                variant="secondary"
                style={{ height: 44, padding: "0 16px" }}
                disabled={selected.status !== "PENDING"}
                onClick={reject}
              >
                {t("hold")}
              </Button>
            </div>

            {selected.status === "BLOCKED" && (
              <div
                style={{
                  border: "1px solid var(--color-accent-400)",
                  background: "var(--color-accent-100)",
                  padding: "12px 14px",
                  fontSize: 12,
                  lineHeight: 1.55,
                  color: "var(--color-accent-900)",
                  marginTop: 14,
                }}
              >
                {selected.blockedReason} {t("blockedNote")}
              </div>
            )}

            {error && <p style={{ fontSize: 12, marginTop: 14, color: "var(--color-accent-700)" }}>{error}</p>}
            {message && <p style={{ fontSize: 12, marginTop: 14 }}>{message}</p>}

            <div style={{ fontSize: 12, lineHeight: 1.55, marginTop: 14 }} className="text-muted">
              {selected.type ? t(`pnote_${selected.type}`) : ""}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function JobRow({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "8px 0",
        borderTop: "1px solid var(--color-divider)",
        fontSize: 13,
      }}
    >
      <span className="text-muted">{k}</span>
      <span style={{ textAlign: "right" }}>{v}</span>
    </div>
  );
}
