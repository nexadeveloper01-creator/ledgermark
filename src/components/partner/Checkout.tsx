"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Corners } from "@/components/ui/Corners";

// 매장 결제(POS): 정가 입력 + 소비자 쿠폰 코드 조회 → 할인 차감 → 결제 확정.
export function Checkout() {
  const [amount, setAmount] = useState("");
  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState<any>(null);
  const [receipt, setReceipt] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const amountNum = Math.floor(Number(amount)) || 0;
  const previewDiscount =
    lookup?.usable && amountNum > 0
      ? lookup.kind === "PERCENT"
        ? Math.min(Math.floor((amountNum * lookup.value) / 100), amountNum)
        : Math.min(lookup.value, amountNum)
      : 0;
  const previewTotal = amountNum - previewDiscount;

  const doLookup = async () => {
    setError(null);
    setReceipt(null);
    setLookup(null);
    if (!code.trim()) return;
    const res = await fetch(`/api/store/coupon?code=${encodeURIComponent(code.trim())}`);
    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? "조회 실패");
      return;
    }
    setLookup(body);
    if (!body.found) setError("존재하지 않는 쿠폰 코드입니다.");
  };

  const pay = async () => {
    setError(null);
    if (amountNum <= 0) {
      setError("결제 금액을 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountNum, couponCode: lookup?.usable ? code.trim() : null }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "결제 실패");
        return;
      }
      setReceipt(body);
      setLookup(null);
      setCode("");
      setAmount("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h3 style={{ fontSize: 17, margin: "0 0 4px" }}>매장 결제 · 쿠폰 차감</h3>
        <p className="text-muted" style={{ fontSize: 12 }}>
          소비자 앱의 쿠폰 코드를 입력해 조회하고, 정가에서 할인을 차감해 결제합니다.
        </p>
      </div>

      <div className="blueprint" style={{ padding: 22, background: "transparent" }}>
        <Corners />
        <div className="field" style={{ marginBottom: 16 }}>
          <label>정가 (₱)</label>
          <input
            className="input"
            inputMode="numeric"
            placeholder="예: 1200"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
          />
        </div>

        <div className="field" style={{ marginBottom: 8 }}>
          <label>쿠폰 코드 (선택)</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              placeholder="예: LM-XXXX-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && doLookup()}
              style={{ flex: 1, fontFamily: "ui-monospace, Menlo, monospace" }}
            />
            <Button variant="secondary" onClick={doLookup}>
              조회
            </Button>
          </div>
        </div>

        {lookup?.found && (
          <div
            style={{
              fontSize: 12.5,
              padding: "10px 12px",
              marginTop: 6,
              border: "1px solid var(--color-divider)",
              color: lookup.usable ? "var(--color-accent-900)" : "var(--color-accent-700)",
              background: lookup.usable ? "var(--color-accent-100)" : "transparent",
            }}
          >
            {lookup.label} · {lookup.ownerName ?? "-"} 님
            {lookup.usable ? " · 사용 가능" : ` · 사용 불가(${lookup.reason ?? lookup.status})`}
          </div>
        )}

        <div style={{ marginTop: 18, borderTop: "1px solid var(--color-divider)", paddingTop: 14 }}>
          <Row k="정가" v={`₱${amountNum.toLocaleString()}`} />
          <Row k="할인" v={previewDiscount > 0 ? `- ₱${previewDiscount.toLocaleString()}` : "₱0"} accent={previewDiscount > 0} />
          <Row k="결제 금액" v={`₱${previewTotal.toLocaleString()}`} strong />
        </div>

        <Button
          variant="primary"
          block
          style={{ marginTop: 18, height: 46 }}
          disabled={busy || amountNum <= 0}
          onClick={pay}
        >
          {busy ? "처리 중..." : "결제 확정"}
        </Button>

        {error && <p style={{ fontSize: 12, marginTop: 12, color: "var(--color-accent-700)" }}>{error}</p>}
      </div>

      {receipt && (
        <div className="blueprint" style={{ padding: 22, background: "transparent" }}>
          <Corners />
          <div className="card-kicker">RECEIPT · 결제 완료</div>
          <Row k="정가" v={`₱${receipt.amount.toLocaleString()}`} />
          {receipt.coupon && <Row k={`쿠폰 (${receipt.coupon.code})`} v={receipt.coupon.label} />}
          <Row k="할인" v={receipt.discount > 0 ? `- ₱${receipt.discount.toLocaleString()}` : "₱0"} accent={receipt.discount > 0} />
          <Row k="결제 금액" v={`₱${receipt.total.toLocaleString()}`} strong />
          <p className="text-muted" style={{ fontSize: 11, marginTop: 10 }}>
            쿠폰은 사용 완료 처리되어 재사용할 수 없습니다.
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, strong, accent }: { k: string; v: string; strong?: boolean; accent?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "7px 0",
        fontSize: strong ? 16 : 13,
        fontWeight: strong ? 700 : 400,
        color: accent ? "var(--color-accent)" : undefined,
      }}
    >
      <span className={strong ? undefined : "text-muted"}>{k}</span>
      <span style={{ fontFamily: strong ? "var(--font-heading)" : undefined }}>{v}</span>
    </div>
  );
}
