"use client";

import Link from "next/link";
import { Corners } from "@/components/ui/Corners";
import { LinkButton } from "@/components/ui/Button";
import { useT, LangToggle, type Dict } from "@/lib/i18n/web";

const txTypes = [
  { code: "01", num: "MINT", key: "tx01" },
  { code: "02", num: "EXPORT_TRANSFER", key: "tx02" },
  { code: "03", num: "WHOLESALE_TRANSFER", key: "tx03" },
  { code: "04", num: "RETAIL_SALE", key: "tx04" },
  { code: "05", num: "EXCHANGE_TRANSFER", key: "tx05" },
  { code: "06", num: "RESALE_TRANSFER", key: "tx06" },
];

const usps = [
  { n: "01", key: "usp01", en: "STATE MACHINE" },
  { n: "02", key: "usp02", en: "PERMISSIONED + ANCHORED" },
  { n: "03", key: "usp03", en: "AVP ROUTER" },
  { n: "04", key: "usp04", en: "APP-FIRST" },
];

const D: Dict = {
  navConsole: { ko: "정부 관제 콘솔", en: "Government console" },
  navPartner: { ko: "매장·총판 웹", en: "Store / distributor" },
  navApp: { ko: "소비자 앱", en: "Consumer app" },
  navField: { ko: "단속 현장", en: "Field" },
  eyebrow: { ko: "NATIONAL DISTRIBUTION LEDGER · 국가 연동형 유통 원장", en: "NATIONAL DISTRIBUTION LEDGER" },
  hero: { ko: "생산부터 소유권 이전까지, 하나의 원장", en: "From production to every transfer of ownership — one ledger" },
  heroBody: {
    ko: "LEDGERMARK는 규제품목의 개별 UID를 생산 시점에 발급하고, 수출·통관·총판·소매·소비자·교환까지 모든 단계를 소유권 이전 트랜잭션으로만 기록합니다. 정부는 밀수 단속 근거를 얻고, 소비자는 정품 인증과 교환 서비스를 얻습니다.",
    en: "LEDGERMARK issues a unique UID for each regulated item at production, and records every stage — export, customs, distribution, retail, consumer, and exchange — only as ownership-transfer transactions. Governments gain enforcement evidence; consumers gain authentication and exchange services.",
  },
  ctaConsole: { ko: "관제 콘솔 보기 / CONSOLE", en: "View console" },
  ctaApp: { ko: "소비자 앱 / APP", en: "Consumer app" },
  smTitle: { ko: "UID 소유권 상태머신", en: "UID ownership state machine" },
  smBody: {
    ko: "UID 레코드의 모든 변경은 정의된 6종 트랜잭션을 통해서만 발생합니다. 임의 수정 경로가 설계상 존재하지 않습니다.",
    en: "Every change to a UID record happens only through the six defined transactions. No arbitrary edit path exists by design.",
  },
  tx01: { ko: "생산 발급", en: "Production mint" },
  tx01d: { ko: "생산 완료 시점, 생산 법인에게 UID를 최초 발급합니다.", en: "At production, a UID is first issued to the producing entity." },
  tx02: { ko: "수출 이전", en: "Export transfer" },
  tx02d: { ko: "수출 시점, 생산 법인에서 수입사로 소유권이 이전됩니다.", en: "At export, ownership transfers from the producer to the importer." },
  tx03: { ko: "총판 배분", en: "Wholesale transfer" },
  tx03d: { ko: "수입사가 지역총판에 배분하며 소유권이 이전됩니다.", en: "The importer distributes to regional wholesalers, transferring ownership." },
  tx04: { ko: "소비자 구매", en: "Retail sale" },
  tx04d: { ko: "연령인증 완료 후 최초 소비자에게 판매되며, 교환권이 1회 발급됩니다.", en: "After age verification, the item is sold to the first consumer and one exchange voucher is issued." },
  tx05: { ko: "불량·색상 교환", en: "Defect / color exchange" },
  tx05d: { ko: "동일 소유자에게 신규 UID가 발급되고, 기존 교환권은 소진됩니다.", en: "A new UID is issued to the same owner and the existing exchange voucher is consumed." },
  tx06: { ko: "중고 거래", en: "Resale" },
  tx06d: { ko: "소비자 간 재판매이며, 교환권은 재발급되지 않아 남용을 차단합니다.", en: "Consumer-to-consumer resale; no exchange voucher is reissued, preventing abuse." },
  usp01: { ko: "소유권 상태머신", en: "Ownership state machine" },
  usp01b: { ko: "UID 변경은 정의된 트랜잭션만 통과합니다. 임의 조작 경로가 없습니다.", en: "UID changes pass only through defined transactions. There is no tampering path." },
  usp02: { ko: "하이브리드 신뢰 구조", en: "Hybrid trust model" },
  usp02b: { ko: "허가형 원장에 해시체인으로 기록하고, 주기적으로 퍼블릭 체인에 앵커링해 제3자 검증을 남깁니다.", en: "Records go into a permissioned hash-chained ledger and are periodically anchored to a public chain for third-party verification." },
  usp03: { ko: "규제 대응 모듈화", en: "Modular compliance" },
  usp03b: { ko: "연령인증 등 국가별 법적 요건을 Provider 계층으로 분리해 다국가 확장에 대응합니다.", en: "Country-specific legal requirements like age verification are isolated into a provider layer for multi-country expansion." },
  usp04: { ko: "하드웨어 비의존", en: "Hardware-independent" },
  usp04b: { ko: "매장 단말기 스펙 불일치를 앱 중심 설계로 우회해 초기 CAPEX를 최소화합니다.", en: "An app-first design sidesteps mismatched store hardware specs and minimizes upfront CAPEX." },
};

export default function LandingPage() {
  const t = useT(D);

  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        className="nav"
        style={{
          borderBottom: "1px solid var(--color-divider)",
          padding: "var(--space-3) var(--space-6)",
        }}
      >
        <span className="nav-brand" style={{ letterSpacing: "0.12em" }}>
          LEDGERMARK
        </span>
        <Link href="/console">{t("navConsole")}</Link>
        <Link href="/partner">{t("navPartner")}</Link>
        <Link href="/app">{t("navApp")}</Link>
        <Link href="/field">{t("navField")}</Link>
        <div style={{ marginLeft: "auto" }}>
          <LangToggle />
        </div>
      </header>

      <div style={{ padding: "88px 32px 72px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--color-accent-700)" }}>
          {t("eyebrow")}
        </div>
        <h1
          style={{
            fontSize: "clamp(36px, 5vw, 72px)",
            lineHeight: 1.05,
            margin: "18px 0 0",
            maxWidth: "18ch",
          }}
        >
          {t("hero")}
        </h1>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 40,
            marginTop: 34,
            alignItems: "start",
          }}
        >
          <p style={{ fontSize: 16, lineHeight: 1.7, margin: 0, maxWidth: "46ch" }}>
            {t("heroBody")}
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <LinkButton
              href="/console"
              variant="primary"
              className="blueprint"
              style={{ height: 46, padding: "0 22px" }}
            >
              <Corners />
              {t("ctaConsole")}
            </LinkButton>
            <LinkButton href="/app" variant="secondary" style={{ height: 46, padding: "0 20px" }}>
              {t("ctaApp")}
            </LinkButton>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 32px 72px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8 }}>
          <h2 style={{ fontSize: 32, margin: 0 }}>{t("smTitle")}</h2>
          <span style={{ fontSize: 11, letterSpacing: "0.16em" }} className="text-muted">
            OWNERSHIP STATE MACHINE
          </span>
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.7, maxWidth: "60ch", margin: "0 0 34px" }}>
          {t("smBody")}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 28 }}>
          {txTypes.map((tx) => (
            <div key={tx.num} className="blueprint" style={{ padding: 18, background: "transparent" }}>
              <Corners />
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--color-accent-700)" }}>
                  {tx.code}
                </span>
                <span
                  style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11 }}
                  className="text-muted"
                >
                  {tx.num}
                </span>
              </div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 18, margin: "8px 0 6px" }}>
                {t(tx.key)}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55 }} className="text-muted">
                {t(`${tx.key}d`)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "0 32px 88px", maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: 32,
            borderTop: "1px solid var(--color-divider)",
            paddingTop: 40,
          }}
        >
          {usps.map((u) => (
            <div key={u.n}>
              <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, color: "var(--color-accent-700)" }}>
                {u.n}
              </div>
              <h4 style={{ fontSize: 18, margin: "8px 0 8px" }}>{t(u.key)}</h4>
              <div style={{ fontSize: 10, letterSpacing: "0.14em", marginBottom: 10 }} className="text-muted">
                {u.en}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.65 }}>{t(`${u.key}b`)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
