"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { useT, LangToggle, type Dict } from "@/lib/i18n/web";

// 무인 자판기(키오스크) 셀프 구매 화면 — 공개. 정품 확인은 실제 원장 기준,
// 결제·배출은 데모 시뮬레이션. 원장은 변경하지 않으며, 구매자는 배출된 제품의
// 정품 등록 코드를 소비자 앱에서 등록한다.
const K: Dict = {
  badge: { ko: "무인 정품 자판기 · SELF-SERVICE", en: "Unmanned authenticity vending · SELF-SERVICE" },
  staff: { ko: "직원 모드", en: "Staff mode" },
  heroT: { ko: "정품 전자담배 자판기", en: "Genuine vape vending machine" },
  heroSub: { ko: "블록체인 원장으로 정품을 확인하고 구매하세요.", en: "Verify authenticity on the blockchain ledger and buy." },
  start: { ko: "구매 시작", en: "Start" },
  ageNote: { ko: "만 20세 미만 구매 불가 · 신분 확인이 진행됩니다", en: "No sales under 20 · ID verification required" },
  selectT: { ko: "제품 선택", en: "Choose a product" },
  soldOutLabel: { ko: "품절 · SOLD OUT", en: "SOLD OUT" },
  stockN: { ko: "재고 {n}개", en: "{n} in stock" },
  soldOut: { ko: "품절", en: "Sold out" },
  buy: { ko: "구매", en: "Buy" },
  noStock: { ko: "현재 판매 가능한 재고가 없습니다.", en: "No stock available right now." },
  cancel: { ko: "취소", en: "Cancel" },
  verifying: { ko: "정품 확인 중…", en: "Verifying authenticity…" },
  ledgerCheck: { ko: "원장 대조", en: "ledger check" },
  notSellable: { ko: "판매 불가", en: "Not for sale" },
  toStart: { ko: "처음으로", en: "Start over" },
  ageT: { ko: "연령 확인", en: "Age check" },
  ageAsk: { ko: "만 20세 이상입니까? 신분증을 리더기에 대주세요.", en: "Are you 20 or older? Please tap your ID on the reader." },
  ageConfirm: { ko: "성인 인증 완료 (데모)", en: "Adult verified (demo)" },
  paying: { ko: "결제 승인 중…", en: "Approving payment…" },
  dispensing: { ko: "배출을 준비하고 있습니다", en: "Preparing to dispense" },
  dispensed: { ko: "배출 완료", en: "Dispensed" },
  claimHint: { ko: "소비자 앱으로 아래 QR을 스캔하면 소유권이 자동 이전되고 300P가 적립됩니다.", en: "Scan the QR below in the consumer app to auto-transfer ownership and earn 300 pts." },
  qrAlt: { ko: "정품 등록 QR", en: "Registration QR" },
};

type Step = "idle" | "select" | "verify" | "age" | "pay" | "done" | "reject";
type Item = { code: string | null; productName: string; lotCode: string; available: number; soldOut: boolean };

export default function KioskPage() {
  const t = useT(K);
  const [step, setStep] = useState<Step>("idle");
  const [items, setItems] = useState<Item[]>([]);
  const [picked, setPicked] = useState<Item | null>(null);
  const [verdict, setVerdict] = useState<any>(null);
  const [qr, setQr] = useState<string>("");

  const loadStock = useCallback(async () => {
    try {
      const res = await fetch("/api/kiosk/stock");
      const body = await res.json();
      setItems(body.items ?? []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  const reset = () => {
    setPicked(null);
    setVerdict(null);
    setQr("");
    setClaimCode("");
    setStep("idle");
    loadStock(); // 재고 갱신(직전 구매분 소진 반영)
  };

  const startShopping = () => {
    loadStock();
    setStep("select");
  };

  const pick = async (it: Item) => {
    if (it.soldOut || !it.code) return; // 품절 제품은 선택 불가
    setPicked(it);
    setStep("verify");
    const res = await fetch(`/api/kiosk/verify?code=${encodeURIComponent(it.code)}`);
    const body = await res.json();
    setVerdict(body);
    setTimeout(() => setStep(body.sellable ? "age" : "reject"), 1100);
  };

  const [claimCode, setClaimCode] = useState("");

  const confirmAge = () => {
    setStep("pay");
    setTimeout(async () => {
      // 결제/배출 → 클레임 발급. QR에는 클레임 코드를 담아 소비자 앱이 스캔 시
      // 소유권이 자동 이전(정품 등록)되게 한다.
      try {
        if (picked) {
          const res = await fetch("/api/kiosk/dispense", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: picked.code }),
          });
          const body = await res.json();
          const cc = body.claimCode as string | undefined;
          if (cc) {
            setClaimCode(cc);
            setQr(await QRCode.toDataURL(cc, { margin: 1, width: 240 }));
          }
        }
      } catch {
        /* 발급 실패 시 QR 없이 완료 화면 */
      }
      setStep("done");
    }, 1600);
  };

  return (
    <div style={sx.screen}>
      <style>{"@keyframes lmspin{to{transform:rotate(360deg)}}"}</style>
      <div style={sx.top}>
        <span style={sx.brand}>LEDGERMARK</span>
        <span style={sx.badge}>{t("badge")}</span>
        <div style={{ marginLeft: "auto" }}><LangToggle /></div>
        <Link href="/partner" style={sx.staff}>
          {t("staff")}
        </Link>
      </div>

      <div style={sx.stage}>
        {step === "idle" && (
          <div style={sx.center}>
            <div style={sx.big}>{t("heroT")}</div>
            <p style={sx.sub}>{t("heroSub")}</p>
            <button style={sx.cta} onClick={startShopping}>
              {t("start")}
            </button>
            <p style={sx.note}>{t("ageNote")}</p>
          </div>
        )}

        {step === "select" && (
          <div style={{ width: "100%", maxWidth: 720 }}>
            <div style={sx.h}>{t("selectT")}</div>
            <div style={sx.grid}>
              {items.map((it) => (
                <button
                  key={it.lotCode + it.productName}
                  style={{ ...sx.product, ...(it.soldOut ? sx.productOut : {}), position: "relative" }}
                  onClick={() => pick(it)}
                  disabled={it.soldOut}
                >
                  <div style={{ fontSize: 15, fontWeight: 800, color: it.soldOut ? "rgba(255,255,255,0.4)" : "#fff" }}>
                    {it.productName}
                  </div>
                  <div style={sx.mono}>{it.lotCode}</div>
                  <div style={{ fontSize: 12, color: it.soldOut ? "#FF8A5B" : "rgba(255,255,255,0.5)", marginTop: 6 }}>
                    {it.soldOut ? t("soldOutLabel") : t("stockN", { n: String(it.available) })}
                  </div>
                  {it.soldOut ? (
                    <div style={{ ...sx.buy, background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.55)" }}>{t("soldOut")}</div>
                  ) : (
                    <div style={sx.buy}>{t("buy")}</div>
                  )}
                </button>
              ))}
              {items.length === 0 && <p style={sx.sub}>{t("noStock")}</p>}
            </div>
            <button style={sx.ghost} onClick={reset}>
              {t("cancel")}
            </button>
          </div>
        )}

        {step === "verify" && (
          <div style={sx.center}>
            <Spinner />
            <div style={sx.big2}>{t("verifying")}</div>
            <p style={sx.sub}>{picked?.productName} · {t("ledgerCheck")}</p>
          </div>
        )}

        {step === "reject" && (
          <div style={sx.center}>
            <div style={{ ...sx.big2, color: "#FF8A5B" }}>{t("notSellable")}</div>
            <p style={sx.sub}>{verdict?.label}</p>
            <button style={sx.cta} onClick={reset}>
              {t("toStart")}
            </button>
          </div>
        )}

        {step === "age" && (
          <div style={sx.center}>
            <div style={sx.check}>✓ {verdict?.label}</div>
            <div style={sx.big2}>{t("ageT")}</div>
            <p style={sx.sub}>{t("ageAsk")}</p>
            <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
              <button style={sx.cta} onClick={confirmAge}>
                {t("ageConfirm")}
              </button>
              <button style={sx.ghost} onClick={reset}>
                {t("cancel")}
              </button>
            </div>
          </div>
        )}

        {step === "pay" && (
          <div style={sx.center}>
            <Spinner />
            <div style={sx.big2}>{t("paying")}</div>
            <p style={sx.sub}>{t("dispensing")}</p>
          </div>
        )}

        {step === "done" && (
          <div style={sx.center}>
            <div style={sx.check}>{t("dispensed")}</div>
            <div style={sx.big2}>{picked?.productName}</div>
            <p style={sx.sub}>{t("claimHint")}</p>
            {qr && <img src={qr} alt={t("qrAlt")} style={sx.qr} />}
            <div style={sx.mono}>{claimCode || picked?.code}</div>
            <button style={{ ...sx.cta, marginTop: 18 }} onClick={reset}>
              {t("toStart")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div
      style={{
        width: 46,
        height: 46,
        borderRadius: "50%",
        border: "4px solid rgba(255,255,255,0.15)",
        borderTopColor: "#4C8DFF",
        animation: "lmspin 0.9s linear infinite",
        marginBottom: 18,
      }}
    />
  );
}

const sx: Record<string, React.CSSProperties> = {
  screen: { minHeight: "100vh", background: "#0E1116", color: "#fff", display: "flex", flexDirection: "column" },
  top: { display: "flex", alignItems: "center", gap: 14, padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)" },
  brand: { fontWeight: 800, letterSpacing: "0.14em" },
  badge: { fontSize: 11, letterSpacing: "0.14em", color: "#8FB4FF", border: "1px solid rgba(143,180,255,0.4)", padding: "3px 10px", borderRadius: 6 },
  staff: { marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.4)" },
  stage: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 },
  center: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" },
  big: { fontSize: 40, fontWeight: 800, letterSpacing: "-0.02em" },
  big2: { fontSize: 30, fontWeight: 800, marginTop: 8 },
  sub: { color: "rgba(255,255,255,0.6)", fontSize: 15, marginTop: 10, lineHeight: 1.6, maxWidth: 460 },
  note: { color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 24 },
  cta: { marginTop: 26, background: "#2E6BFF", color: "#fff", border: "none", borderRadius: 16, padding: "18px 40px", fontSize: 18, fontWeight: 800, cursor: "pointer" },
  ghost: { marginTop: 18, background: "transparent", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 14, padding: "14px 24px", fontSize: 15, cursor: "pointer" },
  h: { fontSize: 22, fontWeight: 800, marginBottom: 18, textAlign: "center" },
  grid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 },
  product: { background: "#171B22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: 22, textAlign: "left", color: "#fff", cursor: "pointer" },
  productOut: { background: "#12151B", border: "1px dashed rgba(255,255,255,0.14)", cursor: "not-allowed", opacity: 0.75 },
  mono: { fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 8, wordBreak: "break-all" },
  buy: { marginTop: 14, display: "inline-block", background: "#2E6BFF", borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 700 },
  check: { color: "#54E39B", fontSize: 20, fontWeight: 800 },
  qr: { width: 200, height: 200, background: "#fff", borderRadius: 16, padding: 10, marginTop: 18 },
};
