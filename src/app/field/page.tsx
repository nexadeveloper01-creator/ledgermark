"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Corners } from "@/components/ui/Corners";
import { SessionBar, useSession } from "@/components/SessionBar";
import { useT, LangToggle, type Dict } from "@/lib/i18n/web";

const D: Dict = {
  landing: { ko: "랜딩", en: "Landing" },
  loading: { ko: "불러오는 중...", en: "Loading..." },
  title: { ko: "현장 정품 확인", en: "Field authenticity check" },
  desc: { ko: "제품에 인쇄된 UID를 스캔·입력하면 정품 여부만 즉시 확인합니다. 원장에 등록된 UID(코니아랩 생산분)면 정품, 없으면 위조입니다.", en: "Scan or enter the UID printed on a product to instantly check authenticity only. A UID registered in the ledger (produced by Conia Lab) is genuine; otherwise it is counterfeit." },
  uidCode: { ko: "UID 코드", en: "UID code" },
  scan: { ko: "정품 확인 / SCAN", en: "Check / SCAN" },
  checking: { ko: "확인 중...", en: "Checking..." },
  rescan: { ko: "재스캔", en: "Re-scan" },
  genuine: { ko: "정품", en: "GENUINE" },
  genuineNote: { ko: "코니아랩이 생산·발급한 정품 UID입니다. 원장에 등록되어 있습니다.", en: "A genuine UID produced and issued by Conia Lab. It is registered in the ledger." },
  fake: { ko: "위조 의심", en: "COUNTERFEIT" },
  fakeNote: { ko: "원장에 등록되지 않은 UID입니다. 정품이 아닙니다(위조·비정상 유통).", en: "This UID is not registered in the ledger. It is not genuine (counterfeit / illicit)." },
  product: { ko: "제품", en: "Product" },
  lot: { ko: "LOT", en: "LOT" },
  status: { ko: "현재 상태", en: "Current status" },
  prompt: { ko: "UID를 스캔하면 정품 여부가 표시됩니다.", en: "Scan a UID to see whether it is genuine." },
  stMINTED: { ko: "생산 발급", en: "Minted" },
  stEXPORTED: { ko: "수입 완료", en: "Imported" },
  stWHOLESALE: { ko: "총판 배분", en: "Wholesale" },
  stRETAIL_SOLD: { ko: "소비자 판매", en: "Retail sold" },
  stEXCHANGED: { ko: "교환됨", en: "Exchanged" },
  stRESOLD: { ko: "중고 거래됨", en: "Resold" },
};

interface Scanned {
  found: boolean;
  code: string;
  productName?: string;
  lot?: string;
  status?: string;
}

export default function FieldPage() {
  const t = useT(D);
  const { user, loading: sessionLoading } = useSession(["FIELD_OFFICER", "ADMIN"]);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Scanned | null>(null);
  const [loading, setLoading] = useState(false);

  const scan = async () => {
    const c = code.trim();
    if (!c) return;
    setLoading(true);
    const res = await fetch(`/api/uid/${encodeURIComponent(c)}`);
    setLoading(false);
    if (!res.ok) {
      // 원장에 없음 = 위조/비정상 유통.
      setResult({ found: false, code: c });
      return;
    }
    const body = await res.json();
    const uid = body.uid ?? body;
    setResult({
      found: true,
      code: uid.code ?? c,
      productName: uid.lot?.productName,
      lot: uid.lot?.code,
      status: uid.status,
    });
  };

  if (sessionLoading || !user) {
    return (
      <p className="text-muted" style={{ padding: 32 }}>
        {t("loading")}
      </p>
    );
  }

  const genuine = result?.found === true;

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
          FIELD · 정품 확인
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <LangToggle />
          <SessionBar user={user} />
          <Link href="/" style={{ fontSize: 13 }}>
            {t("landing")}
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 460, margin: "0 auto", padding: "48px 24px 72px" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.16em", color: "var(--color-accent-700)" }}>
          FIELD ENFORCEMENT
        </div>
        <h2 style={{ fontSize: 30, margin: "6px 0 12px", letterSpacing: "-0.01em" }}>{t("title")}</h2>
        <p style={{ fontSize: 14, lineHeight: 1.65, margin: "0 0 22px" }} className="text-muted">
          {t("desc")}
        </p>

        <div className="field" style={{ marginBottom: 12 }}>
          <label>{t("uidCode")}</label>
          <input
            className="input"
            placeholder="PH-2609-A-000010"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && scan()}
            autoFocus
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="primary" block onClick={scan} disabled={loading || !code.trim()}>
            {loading ? t("checking") : t("scan")}
          </Button>
          {result && (
            <Button
              variant="secondary"
              style={{ padding: "0 16px" }}
              onClick={() => {
                setResult(null);
                setCode("");
              }}
            >
              {t("rescan")}
            </Button>
          )}
        </div>

        {result && (
          <div
            className="blueprint"
            style={{
              marginTop: 28,
              padding: "26px 22px",
              background: genuine ? "var(--color-accent-100)" : "var(--color-bg)",
              borderColor: genuine ? "var(--color-accent)" : "var(--color-accent-700)",
            }}
          >
            <Corners />
            <div style={{ fontSize: 11, letterSpacing: "0.16em" }} className="text-muted">
              {genuine ? "VERIFIED · GENUINE" : "NOT REGISTERED · COUNTERFEIT"}
            </div>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 44,
                lineHeight: 1.05,
                margin: "8px 0 10px",
                color: genuine ? "var(--color-accent-900)" : "var(--color-accent-700)",
              }}
            >
              {genuine ? `✓ ${t("genuine")}` : `✕ ${t("fake")}`}
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              {genuine ? t("genuineNote") : t("fakeNote")}
            </p>

            <div
              style={{
                marginTop: 18,
                fontFamily: "ui-monospace, Menlo, monospace",
                fontSize: 14,
                wordBreak: "break-all",
              }}
            >
              {result.code}
            </div>

            {genuine && (
              <div style={{ marginTop: 12 }}>
                <Row k={t("product")} v={result.productName ?? "—"} />
                <Row k={t("lot")} v={result.lot ?? "—"} />
                <Row k={t("status")} v={result.status ? t(`st${result.status}`) : "—"} />
              </div>
            )}
          </div>
        )}

        {!result && (
          <p className="text-muted" style={{ fontSize: 13, marginTop: 24 }}>
            {t("prompt")}
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
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
