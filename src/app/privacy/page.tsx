import Link from "next/link";

export const metadata = { title: "개인정보 처리방침 · Privacy Policy" };

const box: React.CSSProperties = { maxWidth: 760, margin: "0 auto", padding: "40px 24px 80px", lineHeight: 1.7 };
const h2: React.CSSProperties = { fontSize: 18, marginTop: 28, marginBottom: 8 };
const muted: React.CSSProperties = { color: "var(--color-muted, #5C6577)", fontSize: 13 };

export default function PrivacyPage() {
  return (
    <div style={box}>
      <p style={{ fontSize: 12, letterSpacing: "0.14em", color: "var(--color-accent-700)" }}>LEDGERMARK</p>
      <h1 style={{ fontSize: 26, margin: "4px 0 4px" }}>개인정보 처리방침</h1>
      <p style={muted}>최종 업데이트: 2026-09-07 · 본 서비스는 만 20세 이상 성인을 대상으로 합니다.</p>

      <h2 style={h2}>1. 수집하는 정보</h2>
      <ul>
        <li>계정 정보: 이메일, 표시 이름, 비밀번호(해시로만 저장)</li>
        <li>이용 정보: 정품(기기) 등록 내역, 포인트·쿠폰·설문 응답, 주간 접속 기록</li>
        <li>동의 기반 정보(선택): 프로필(연령대·지역), 사용 습관, 위치, 마케팅 활용 — 각 항목은 동의 시에만 수집·활용</li>
        <li>연령 확인 결과 크리덴셜(검증 결과만 저장하며 신분증 원본은 저장하지 않음)</li>
        <li>기기 카메라: QR/UID 스캔에만 사용하며 이미지를 서버로 전송·저장하지 않음</li>
      </ul>

      <h2 style={h2}>2. 이용 목적</h2>
      <p>정품 인증·소유권 관리, 포인트/혜택 제공, 맞춤 혜택 및 제품 개선, 부정 유통 방지, 법령 준수.</p>

      <h2 style={h2}>3. 보관 및 파기 · 계정 삭제</h2>
      <p>
        앱 내 <b>설정 &gt; 계정 삭제</b>에서 언제든 계정을 삭제할 수 있습니다. 삭제 시 이메일·이름 등
        식별 정보는 즉시 익명화되고 로그인은 차단됩니다. 다만 위·변조 방지를 위한 허가형 원장(유통 이력)
        기록은 무결성 유지를 위해 삭제하지 않고 소유자 표시를 익명화하여 보존합니다.
      </p>

      <h2 style={h2}>4. 제3자 제공</h2>
      <p>동의 없이 개인정보를 판매하지 않습니다. 법령에 따른 요청 또는 서비스 제공에 필요한 최소 범위에서만 처리합니다.</p>

      <h2 style={h2}>5. 이용자 권리</h2>
      <p>열람·정정·삭제·동의 철회를 요청할 수 있으며, 앱 내 동의 관리 및 계정 삭제로 직접 수행할 수 있습니다.</p>

      <h2 style={h2}>6. 문의</h2>
      <p style={muted}>privacy@ledgermark.example (운영 시 실제 연락처로 교체)</p>

      <hr style={{ margin: "36px 0", border: 0, borderTop: "1px solid var(--color-divider, #E4E8F0)" }} />

      <h1 style={{ fontSize: 22, margin: "4px 0" }}>Privacy Policy (English)</h1>
      <p style={muted}>Last updated: 2026-09-07 · This service is intended for adults aged 20+.</p>
      <h2 style={h2}>1. Data we collect</h2>
      <ul>
        <li>Account: email, display name, password (stored only as a hash)</li>
        <li>Usage: product registrations, points/coupons/survey responses, weekly check-ins</li>
        <li>Consent-based (optional): profile (age band, region), usage habits, location, marketing — collected only with your consent per scope</li>
        <li>Age-verification credential (result only; no ID image is stored)</li>
        <li>Camera: used only for QR/UID scanning; images are not sent to or stored on our servers</li>
      </ul>
      <h2 style={h2}>2. How we use it</h2>
      <p>Authenticity and ownership management, points/benefits, tailored benefits and product improvement, anti-diversion, and legal compliance.</p>
      <h2 style={h2}>3. Retention & account deletion</h2>
      <p>
        You can delete your account anytime via <b>Settings &gt; Delete account</b> in the app. Identifiers such as
        email and name are anonymized immediately and sign-in is disabled. For anti-counterfeiting integrity, the
        permissioned ledger (distribution history) is retained with the owner reference anonymized rather than deleted.
      </p>
      <h2 style={h2}>4. Sharing</h2>
      <p>We do not sell personal data. We process it only as required by law or to provide the service.</p>
      <h2 style={h2}>5. Your rights</h2>
      <p>You may access, correct, delete, or withdraw consent — directly via in-app consent management and account deletion.</p>
      <h2 style={h2}>6. Contact</h2>
      <p style={muted}>privacy@ledgermark.example (replace with a real contact in production)</p>

      <p style={{ marginTop: 40 }}><Link href="/">← LEDGERMARK</Link></p>
    </div>
  );
}
