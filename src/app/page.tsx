import Link from "next/link";
import { Corners } from "@/components/ui/Corners";
import { LinkButton } from "@/components/ui/Button";

const marketStats = [
  { value: "$112.7M", ko: "2024년 필리핀 전자담배 시장 규모", en: "2024 MARKET SIZE" },
  { value: "17.7%", ko: "연평균 성장률(CAGR)", en: "CAGR" },
  { value: "$488.6M", ko: "2033년 예상 시장 규모", en: "2033 PROJECTED" },
  { value: "541억 페소", ko: "예상 조세수입 손실 (연간)", en: "EST. TAX LEAKAGE" },
];

const txTypes = [
  { code: "01", num: "MINT", ko: "생산 발급", detail: "생산 완료 시점, 생산 법인에게 UID를 최초 발급합니다." },
  { code: "02", num: "EXPORT_TRANSFER", ko: "수출 이전", detail: "수출 시점, 생산 법인에서 수입사로 소유권이 이전됩니다." },
  { code: "03", num: "WHOLESALE_TRANSFER", ko: "총판 배분", detail: "수입사가 지역총판에 배분하며 소유권이 이전됩니다." },
  {
    code: "04",
    num: "RETAIL_SALE",
    ko: "소비자 구매",
    detail: "연령인증 완료 후 최초 소비자에게 판매되며, 교환권이 1회 발급됩니다.",
  },
  {
    code: "05",
    num: "EXCHANGE_TRANSFER",
    ko: "불량·색상 교환",
    detail: "동일 소유자에게 신규 UID가 발급되고, 기존 교환권은 소진됩니다.",
  },
  {
    code: "06",
    num: "RESALE_TRANSFER",
    ko: "중고 거래",
    detail: "소비자 간 재판매이며, 교환권은 재발급되지 않아 남용을 차단합니다.",
  },
];

const usps = [
  {
    n: "01",
    title: "소유권 상태머신",
    en: "STATE MACHINE",
    body: "UID 변경은 정의된 트랜잭션만 통과합니다. 임의 조작 경로가 없습니다.",
  },
  {
    n: "02",
    title: "하이브리드 신뢰 구조",
    en: "PERMISSIONED + ANCHORED",
    body: "허가형 원장에 해시체인으로 기록하고, 주기적으로 퍼블릭 체인에 앵커링해 제3자 검증을 남깁니다.",
  },
  {
    n: "03",
    title: "규제 대응 모듈화",
    en: "AVP ROUTER",
    body: "연령인증 등 국가별 법적 요건을 Provider 계층으로 분리해 다국가 확장에 대응합니다.",
  },
  {
    n: "04",
    title: "하드웨어 비의존",
    en: "APP-FIRST",
    body: "매장 단말기 스펙 불일치를 앱 중심 설계로 우회해 초기 CAPEX를 최소화합니다.",
  },
];

export default function LandingPage() {
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
        <Link href="/console">정부 관제 콘솔</Link>
        <Link href="/partner">매장·총판 웹</Link>
        <Link href="/app">소비자 앱</Link>
      </header>

      <div style={{ padding: "88px 32px 72px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--color-accent-700)" }}>
          NATIONAL DISTRIBUTION LEDGER · 국가 연동형 유통 원장
        </div>
        <h1
          style={{
            fontSize: "clamp(36px, 5vw, 72px)",
            lineHeight: 1.05,
            margin: "18px 0 0",
            maxWidth: "18ch",
          }}
        >
          생산부터 소유권 이전까지, 하나의 원장
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
            LEDGERMARK는 규제품목의 개별 UID를 생산 시점에 발급하고, 수출·통관·총판·소매·소비자·교환까지
            모든 단계를 소유권 이전 트랜잭션으로만 기록합니다. 정부는 밀수 단속 근거를 얻고, 소비자는
            정품 인증과 교환 서비스를 얻습니다.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <LinkButton
              href="/console"
              variant="primary"
              className="blueprint"
              style={{ height: 46, padding: "0 22px" }}
            >
              <Corners />
              관제 콘솔 보기 / CONSOLE
            </LinkButton>
            <LinkButton href="/app" variant="secondary" style={{ height: 46, padding: "0 20px" }}>
              소비자 앱 / APP
            </LinkButton>
          </div>
        </div>
      </div>

      <div style={{ background: "var(--color-accent-900)", color: "var(--color-bg)", padding: "56px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.2em", opacity: 0.7 }}>
            PHILIPPINES · MARKET &amp; LEAKAGE
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 44,
              marginTop: 32,
            }}
          >
            {marketStats.map((stat) => (
              <div key={stat.en}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 40, lineHeight: 1 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 13, marginTop: 8, opacity: 0.85, lineHeight: 1.45 }}>{stat.ko}</div>
                <div style={{ fontSize: 10, letterSpacing: "0.14em", marginTop: 6, opacity: 0.55 }}>
                  {stat.en}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, marginTop: 30, opacity: 0.6 }}>
            출처: 필리핀 전자담배 제안서 자료 (2024 기준) — [Fact]
          </div>
        </div>
      </div>

      <div style={{ padding: "72px 32px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8 }}>
          <h2 style={{ fontSize: 32, margin: 0 }}>UID 소유권 상태머신</h2>
          <span style={{ fontSize: 11, letterSpacing: "0.16em" }} className="text-muted">
            OWNERSHIP STATE MACHINE
          </span>
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.7, maxWidth: "60ch", margin: "0 0 34px" }}>
          UID 레코드의 모든 변경은 정의된 6종 트랜잭션을 통해서만 발생합니다. 임의 수정 경로가 설계상
          존재하지 않습니다.
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
                {tx.ko}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.55 }} className="text-muted">
                {tx.detail}
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
              <h4 style={{ fontSize: 18, margin: "8px 0 8px" }}>{u.title}</h4>
              <div style={{ fontSize: 10, letterSpacing: "0.14em", marginBottom: 10 }} className="text-muted">
                {u.en}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.65 }}>{u.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
