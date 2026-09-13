"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Corners } from "@/components/ui/Corners";
import { useT, type Dict } from "@/lib/i18n/web";

const D: Dict = {
  title: { ko: "매장 결제 · 쿠폰 차감", en: "Checkout · coupon redemption", fil: "Bayad · pag-redeem ng kupon" },
  sub: { ko: "소비자 앱의 쿠폰 코드를 입력해 조회하고, 정가에서 할인을 차감해 결제합니다.", en: "Look up the consumer's coupon and deduct the discount at checkout.", fil: "Hanapin ang kupon ng mamimili at ibawas ang diskwento sa bayad." },
  price: { ko: "정가 (₱)", en: "Price (₱)", fil: "Presyo (₱)" },
  pricePh: { ko: "예: 1200", en: "e.g. 1200", fil: "hal. 1200" },
  payMethod: { ko: "결제 수단", en: "Payment method", fil: "Paraan ng bayad" },
  cash: { ko: "현금", en: "Cash", fil: "Cash" },
  card: { ko: "카드", en: "Card", fil: "Card" },
  other: { ko: "기타", en: "Other", fil: "Iba pa" },
  refPh: { ko: "승인번호·참조 (선택)", en: "Approval / reference (optional)", fil: "Approval / reference (opsyonal)" },
  couponLabel: { ko: "쿠폰 (앱 QR 스캔 또는 코드 입력)", en: "Coupon (scan app QR or enter code)", fil: "Kupon (i-scan ang QR o ilagay ang code)" },
  scan: { ko: "QR 스캔", en: "Scan QR", fil: "I-scan ang QR" },
  stop: { ko: "중지", en: "Stop", fil: "Itigil" },
  lookup: { ko: "조회", en: "Look up", fil: "Hanapin" },
  scanHint: { ko: "소비자 앱의 쿠폰 QR을 카메라에 비춰주세요.", en: "Point the camera at the consumer app's coupon QR.", fil: "Itutok ang camera sa QR ng kupon sa app." },
  usable: { ko: "사용 가능", en: "Available", fil: "Magagamit" },
  unusable: { ko: "사용 불가", en: "Not usable", fil: "Hindi magagamit" },
  owner: { ko: "님", en: "", fil: "" },
  rowPrice: { ko: "정가", en: "Price", fil: "Presyo" },
  rowDiscount: { ko: "할인", en: "Discount", fil: "Diskwento" },
  rowTotal: { ko: "결제 금액", en: "Total", fil: "Kabuuan" },
  rowMethod: { ko: "결제 수단", en: "Method", fil: "Paraan" },
  rowRef: { ko: "참조", en: "Reference", fil: "Reference" },
  pay: { ko: "결제 확정", en: "Confirm payment", fil: "Kumpirmahin ang bayad" },
  paying: { ko: "처리 중...", en: "Processing...", fil: "Pinoproseso..." },
  needAmount: { ko: "결제 금액을 입력해주세요.", en: "Enter the amount.", fil: "Ilagay ang halaga." },
  lookupFail: { ko: "조회 실패", en: "Lookup failed", fil: "Nabigo ang paghahanap" },
  notFound: { ko: "존재하지 않는 쿠폰 코드입니다.", en: "Coupon code not found.", fil: "Hindi nahanap ang code ng kupon." },
  camFail: { ko: "카메라를 열 수 없습니다. 코드 직접 입력을 사용하세요.", en: "Cannot open camera. Enter the code manually.", fil: "Hindi mabuksan ang camera. Ilagay ang code nang manu-mano." },
  payFail: { ko: "결제 실패", en: "Payment failed", fil: "Nabigo ang bayad" },
  receipt: { ko: "RECEIPT · 결제 완료", en: "RECEIPT · paid", fil: "RESIBO · bayad na" },
  couponWord: { ko: "쿠폰", en: "Coupon", fil: "Kupon" },
  used: { ko: "쿠폰은 사용 완료 처리되어 재사용할 수 없습니다.", en: "The coupon is marked used and cannot be reused.", fil: "Namarkahang ginamit na ang kupon at hindi na magagamit muli." },
};

// 매장 결제(POS): 정가 입력 + 소비자 쿠폰 QR 스캔(또는 코드 입력) → 할인 차감 → 결제 확정.
export function Checkout() {
  const t = useT(D);
  const [amount, setAmount] = useState("");
  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState<any>(null);
  const [receipt, setReceipt] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [method, setMethod] = useState<"CASH" | "CARD" | "OTHER">("CASH");
  const [reference, setReference] = useState("");
  const scannerRef = useRef<any>(null);

  const amountNum = Math.floor(Number(amount)) || 0;
  const previewDiscount =
    lookup?.usable && amountNum > 0
      ? lookup.kind === "PERCENT"
        ? Math.min(Math.floor((amountNum * lookup.value) / 100), amountNum)
        : Math.min(lookup.value, amountNum)
      : 0;
  const previewTotal = amountNum - previewDiscount;

  const doLookup = async (raw?: string) => {
    const q = (raw ?? code).trim().toUpperCase();
    setError(null);
    setReceipt(null);
    setLookup(null);
    if (!q) return;
    const res = await fetch(`/api/store/coupon?code=${encodeURIComponent(q)}`);
    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? t("lookupFail"));
      return;
    }
    setLookup(body);
    if (!body.found) setError(t("notFound"));
  };

  const stopScan = async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (s) {
      try {
        await s.stop();
        await s.clear();
      } catch {
        /* 이미 정지됨 */
      }
    }
    setScanning(false);
  };

  const startScan = async () => {
    setError(null);
    setReceipt(null);
    setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      // 렌더 후 reader div가 존재하도록 다음 틱까지 대기
      await new Promise((r) => setTimeout(r, 50));
      const scanner = new Html5Qrcode("lm-qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 240 },
        async (decoded: string) => {
          const text = decoded.trim().toUpperCase();
          setCode(text);
          await stopScan();
          doLookup(text);
        },
        () => {}
      );
    } catch (e) {
      setError(t("camFail"));
      await stopScan();
    }
  };

  useEffect(() => {
    return () => {
      // 언마운트 시 카메라 정리
      const s = scannerRef.current;
      if (s) s.stop().catch(() => {});
    };
  }, []);

  const pay = async () => {
    setError(null);
    if (amountNum <= 0) {
      setError(t("needAmount"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountNum,
          couponCode: lookup?.usable ? code.trim() : null,
          method,
          reference: reference.trim() || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? t("payFail"));
        return;
      }
      setReceipt(body);
      setLookup(null);
      setCode("");
      setAmount("");
      setReference("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h3 style={{ fontSize: 17, margin: "0 0 4px" }}>{t("title")}</h3>
        <p className="text-muted" style={{ fontSize: 12 }}>
          {t("sub")}
        </p>
      </div>

      <div className="blueprint" style={{ padding: 22, background: "transparent" }}>
        <Corners />
        <div className="field" style={{ marginBottom: 16 }}>
          <label>{t("price")}</label>
          <input
            className="input"
            inputMode="numeric"
            placeholder={t("pricePh")}
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
          />
        </div>

        <div className="field" style={{ marginBottom: 16 }}>
          <label>{t("payMethod")}</label>
          <div style={{ display: "flex", gap: 8 }}>
            {(["CASH", "CARD", "OTHER"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className="btn"
                style={{
                  flex: 1,
                  height: 40,
                  fontSize: 13,
                  border: `1px solid ${method === m ? "var(--color-accent)" : "var(--color-divider)"}`,
                  background: method === m ? "var(--color-accent-100)" : "var(--color-surface, #fff)",
                  color: method === m ? "var(--color-accent-900)" : "var(--color-muted)",
                }}
              >
                {m === "CASH" ? t("cash") : m === "CARD" ? t("card") : t("other")}
              </button>
            ))}
          </div>
          {method !== "CASH" && (
            <input
              className="input"
              placeholder={t("refPh")}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              style={{ marginTop: 8 }}
            />
          )}
        </div>

        <div className="field" style={{ marginBottom: 8 }}>
          <label>{t("couponLabel")}</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              placeholder="LM-XXXX-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && doLookup()}
              style={{ flex: 1, fontFamily: "ui-monospace, Menlo, monospace" }}
            />
            <Button variant="primary" onClick={scanning ? stopScan : startScan}>
              {scanning ? t("stop") : t("scan")}
            </Button>
            <Button variant="secondary" onClick={() => doLookup()}>
              {t("lookup")}
            </Button>
          </div>
        </div>

        {scanning && (
          <div style={{ margin: "8px 0 4px" }}>
            <div
              id="lm-qr-reader"
              style={{ width: "100%", maxWidth: 320, margin: "0 auto", border: "1px solid var(--color-divider)" }}
            />
            <p className="text-muted" style={{ fontSize: 11, textAlign: "center", marginTop: 6 }}>
              {t("scanHint")}
            </p>
          </div>
        )}

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
            {lookup.label} · {lookup.ownerName ?? "-"}{t("owner") ? " " + t("owner") : ""}
            {lookup.usable ? ` · ${t("usable")}` : ` · ${t("unusable")}(${lookup.reason ?? lookup.status})`}
          </div>
        )}

        <div style={{ marginTop: 18, borderTop: "1px solid var(--color-divider)", paddingTop: 14 }}>
          <Row k={t("rowPrice")} v={`₱${amountNum.toLocaleString()}`} />
          <Row k={t("rowDiscount")} v={previewDiscount > 0 ? `- ₱${previewDiscount.toLocaleString()}` : "₱0"} accent={previewDiscount > 0} />
          <Row k={t("rowTotal")} v={`₱${previewTotal.toLocaleString()}`} strong />
        </div>

        <Button
          variant="primary"
          block
          style={{ marginTop: 18, height: 46 }}
          disabled={busy || amountNum <= 0}
          onClick={pay}
        >
          {busy ? t("paying") : t("pay")}
        </Button>

        {error && <p style={{ fontSize: 12, marginTop: 12, color: "var(--color-accent-700)" }}>{error}</p>}
      </div>

      {receipt && (
        <div className="blueprint" style={{ padding: 22, background: "transparent" }}>
          <Corners />
          <div className="card-kicker">{t("receipt")}</div>
          <Row k={t("rowPrice")} v={`₱${receipt.amount.toLocaleString()}`} />
          {receipt.coupon && <Row k={`${t("couponWord")} (${receipt.coupon.code})`} v={receipt.coupon.label} />}
          <Row k={t("rowDiscount")} v={receipt.discount > 0 ? `- ₱${receipt.discount.toLocaleString()}` : "₱0"} accent={receipt.discount > 0} />
          <Row k={t("rowMethod")} v={receipt.method === "CASH" ? t("cash") : receipt.method === "CARD" ? t("card") : t("other")} />
          {receipt.reference && <Row k={t("rowRef")} v={receipt.reference} />}
          <Row k={t("rowTotal")} v={`₱${receipt.total.toLocaleString()}`} strong />
          <p className="text-muted" style={{ fontSize: 11, marginTop: 10 }}>
            {t("used")}
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
