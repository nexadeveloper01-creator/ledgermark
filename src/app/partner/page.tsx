"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Corners } from "@/components/ui/Corners";
import { SessionBar, useSession } from "@/components/SessionBar";

const TYPE_LABEL: Record<string, { en: string; ko: string; cta: string; note: string }> = {
  RETAIL_SALE: {
    en: "RETAIL SALE",
    ko: "소매 판매 처리",
    cta: "소유권 이전 / COMMIT",
    note: "커밋 시 RETAIL_SALE 트랜잭션이 원장에 기록되고 다음 앵커링에 포함됩니다.",
  },
  EXCHANGE_TRANSFER: {
    en: "EXCHANGE",
    ko: "불량 교환 처리",
    cta: "교환 승인 / COMMIT",
    note: "기존 교환권은 소진되고 신규 UID는 동일 소유자에게 귀속됩니다.",
  },
  WHOLESALE_TRANSFER: {
    en: "WHOLESALE",
    ko: "총판 배분",
    cta: "일괄 이전 / COMMIT",
    note: "LOT 단위 배분도 UID별 소유권 이전 트랜잭션으로 원장에 기록됩니다.",
  },
};

const STATE_LABEL: Record<string, string> = {
  PENDING: "처리 대기",
  COMMITTED: "이전 완료",
  BLOCKED: "판매 차단",
  REJECTED: "반려됨",
};

export default function PartnerPage() {
  const { user, loading } = useSession(["PARTNER_STAFF", "ADMIN"]);
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
        불러오는 중...
      </p>
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
    setMessage("원장에 소유권 이전 트랜잭션이 기록되었습니다.");
    load();
  };

  const reject = async () => {
    if (!selected) return;
    setError(null);
    setMessage(null);
    await fetch(`/api/requests/${selected.id}/reject`, { method: "POST" });
    setMessage("요청을 반려했습니다.");
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
          DISTRIBUTOR · RETAIL
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <SessionBar user={user} />
          <Link href="/" style={{ fontSize: 13 }}>
            랜딩
          </Link>
        </div>
      </div>

      <div
        style={{
          padding: 32,
          maxWidth: 1400,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.45fr) minmax(340px, 1fr)",
          gap: 44,
          alignItems: "start",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 17 }}>소유권 이전 대기 큐</h3>
            <span style={{ fontSize: 10, letterSpacing: "0.14em" }} className="text-muted">
              TRANSFER QUEUE
            </span>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>UID</th>
                <th>요청 / REQUEST</th>
                <th>신청자</th>
                <th>상태</th>
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
                      {STATE_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-muted">
                    대기 중인 요청이 없습니다.
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
              {selected.status === "BLOCKED" ? "BLOCKED" : TYPE_LABEL[selected.type]?.en}
            </div>
            <h3 style={{ fontSize: 21, margin: "5px 0 4px" }}>
              {selected.status === "BLOCKED" ? "판매 차단" : TYPE_LABEL[selected.type]?.ko}
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

            <JobRow k="제품" v={selected.uid.lot?.productName ?? "—"} />
            <JobRow k="현재 상태" v={selected.uid.status} />
            <JobRow k="이전 소유자" v={selected.fromOrg?.name ?? "—"} />
            <JobRow
              k="신규 소유자"
              v={selected.requestedConsumer?.displayName ?? selected.toOrg?.name ?? "—"}
            />
            {selected.type === "RETAIL_SALE" && (
              <JobRow k="연령인증" v={selected.ageVerified ? "앱 인증 완료" : "미완료"} />
            )}
            {selected.type === "EXCHANGE_TRANSFER" && (
              <JobRow k="교환권" v={`${selected.uid.voucherState} · 소진 예정`} />
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
                {TYPE_LABEL[selected.type]?.cta ?? "커밋"}
              </Button>
              <Button
                variant="secondary"
                style={{ height: 44, padding: "0 16px" }}
                disabled={selected.status !== "PENDING"}
                onClick={reject}
              >
                보류
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
                {selected.blockedReason} 관제 콘솔로 밀수 의심 알림이 전송되었습니다.
              </div>
            )}

            {error && <p style={{ fontSize: 12, marginTop: 14, color: "var(--color-accent-700)" }}>{error}</p>}
            {message && <p style={{ fontSize: 12, marginTop: 14 }}>{message}</p>}

            <div style={{ fontSize: 12, lineHeight: 1.55, marginTop: 14 }} className="text-muted">
              {TYPE_LABEL[selected.type]?.note}
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
