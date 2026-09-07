import Link from "next/link";

export const metadata = { title: "이용약관 · Terms of Service" };

const box: React.CSSProperties = { maxWidth: 760, margin: "0 auto", padding: "40px 24px 80px", lineHeight: 1.7 };
const h2: React.CSSProperties = { fontSize: 18, marginTop: 28, marginBottom: 8 };
const muted: React.CSSProperties = { color: "var(--color-muted, #5C6577)", fontSize: 13 };

export default function TermsPage() {
  return (
    <div style={box}>
      <p style={{ fontSize: 12, letterSpacing: "0.14em", color: "var(--color-accent-700)" }}>LEDGERMARK</p>
      <h1 style={{ fontSize: 26, margin: "4px 0 4px" }}>이용약관</h1>
      <p style={muted}>최종 업데이트: 2026-09-07</p>

      <h2 style={h2}>1. 서비스</h2>
      <p>LEDGERMARK는 정품 인증·소유권 이력 관리와 관련 혜택(포인트·쿠폰)을 제공하는 서비스입니다. 제품의 직접 판매를 대행하지 않습니다.</p>
      <h2 style={h2}>2. 연령 제한</h2>
      <p>본 서비스는 니코틴 함유 제품과 관련되어 <b>만 20세 이상 성인</b>만 이용할 수 있습니다. 미성년자의 이용은 금지됩니다.</p>
      <h2 style={h2}>3. 포인트·쿠폰</h2>
      <p>포인트·쿠폰은 서비스 내 혜택 수단이며 현금 환급 대상이 아닙니다. 부정 취득·악용 시 회수될 수 있습니다.</p>
      <h2 style={h2}>4. 이용자 의무</h2>
      <p>타인 사칭, 위·변조, 서비스 방해, 관련 법령 위반 행위를 해서는 안 됩니다.</p>
      <h2 style={h2}>5. 책임 한계</h2>
      <p>서비스는 "있는 그대로" 제공되며, 관련 법령이 허용하는 범위에서 책임이 제한됩니다.</p>
      <h2 style={h2}>6. 계정 해지</h2>
      <p>이용자는 앱 내 설정에서 계정을 삭제할 수 있습니다. 처리 방식은 개인정보 처리방침을 따릅니다.</p>

      <hr style={{ margin: "36px 0", border: 0, borderTop: "1px solid var(--color-divider, #E4E8F0)" }} />

      <h1 style={{ fontSize: 22, margin: "4px 0" }}>Terms of Service (English)</h1>
      <p style={muted}>Last updated: 2026-09-07</p>
      <h2 style={h2}>1. Service</h2>
      <p>LEDGERMARK provides product authentication, ownership history, and related benefits (points/coupons). It does not act as a direct seller of products.</p>
      <h2 style={h2}>2. Age restriction</h2>
      <p>As the service relates to nicotine-containing products, it is available only to <b>adults aged 20+</b>. Use by minors is prohibited.</p>
      <h2 style={h2}>3. Points & coupons</h2>
      <p>Points and coupons are in-service benefits, not redeemable for cash, and may be revoked if obtained or used fraudulently.</p>
      <h2 style={h2}>4. User obligations</h2>
      <p>No impersonation, tampering, service disruption, or violation of applicable laws.</p>
      <h2 style={h2}>5. Limitation of liability</h2>
      <p>The service is provided "as is", with liability limited to the extent permitted by law.</p>
      <h2 style={h2}>6. Account termination</h2>
      <p>You can delete your account in the app settings; handling follows the Privacy Policy.</p>

      <p style={{ marginTop: 40 }}><Link href="/">← LEDGERMARK</Link></p>
    </div>
  );
}
