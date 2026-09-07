import Link from "next/link";
import QRCode from "qrcode";

// 소비자 앱 배포(퍼블리싱) 페이지 — APK 다운로드 + 설치 안내 + 시연 계정 + 설치 QR.
// 공개 페이지(인증 불필요). APK는 /public/download/ 에서 정적 서빙된다.
export const metadata = {
  title: "LEDGERMARK 앱 설치",
  description: "정품 인증 소비자 앱 다운로드",
};

const SITE = process.env.APP_BASE_URL || "https://app-production-daca.up.railway.app";
const APK = "/download/ledgermark-consumer.apk";

export default async function DownloadPage() {
  // 폰으로 스캔하면 이 설치 페이지가 열리도록 QR을 서버에서 생성한다.
  const qrSvg = await QRCode.toString(`${SITE}/download`, {
    type: "svg",
    margin: 1,
    width: 168,
    color: { dark: "#0E1116", light: "#00000000" },
  });
  return (
    <div style={{ minHeight: "100vh" }}>
      <div
        className="nav"
        style={{ borderBottom: "1px solid var(--color-divider)", padding: "0 32px", height: 64, gap: 16 }}
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
          CONSUMER APP · ANDROID
        </span>
        <div style={{ marginLeft: "auto" }}>
          <Link href="/" style={{ fontSize: 13 }}>
            랜딩
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>
        <h1 style={{ fontSize: 30, margin: "0 0 8px" }}>정품 인증 소비자 앱</h1>
        <p className="text-muted" style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 28px" }}>
          QR 스캔으로 정품을 확인하고, 등록·설문·출석으로 포인트를 모아 경품·할인 혜택으로 쓰는
          안드로이드 앱입니다. 아래 버튼으로 설치 파일(APK)을 내려받으세요.
        </p>

        <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <a
              href={APK}
              className="btn btn-primary blueprint"
              style={{ height: 52, fontSize: 15, display: "inline-flex", alignItems: "center", padding: "0 28px" }}
            >
              APK 다운로드 (Android)
            </a>
            <p className="text-muted" style={{ fontSize: 12, marginTop: 10 }}>
              약 73MB · Android 6.0+ · 데모/파일럿 빌드
            </p>
          </div>

          <div
            className="blueprint"
            style={{ padding: 16, background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
          >
            <div style={{ width: 152, height: 152 }} dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <span className="text-muted" style={{ fontSize: 11, letterSpacing: "0.06em" }}>
              폰으로 스캔해 설치
            </span>
          </div>
        </div>

        <Section title="설치 방법">
          <ol style={{ paddingLeft: 18, fontSize: 13.5, lineHeight: 1.9, margin: 0 }}>
            <li>위 버튼을 눌러 APK를 다운로드합니다.</li>
            <li>알림에서 파일을 열거나 &lsquo;파일&rsquo; 앱의 다운로드 폴더에서 실행합니다.</li>
            <li>
              &lsquo;출처를 알 수 없는 앱 설치&rsquo; 권한을 요청하면 허용합니다(설정 → 앱 → 이 브라우저에
              설치 허용).
            </li>
            <li>설치 후 실행하고 아래 시연 계정으로 로그인합니다.</li>
          </ol>
        </Section>

        <Section title="시연 계정">
          <table className="table" style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th>용도</th>
                <th>이메일</th>
                <th>비밀번호</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>활발한 소비자(포인트·쿠폰·추가교환 자격)</td>
                <td style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>ramon@demo.ph</td>
                <td style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>ledgermark1234</td>
              </tr>
              <tr>
                <td>일반 소비자</td>
                <td style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>juan@demo.ph</td>
                <td style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>ledgermark1234</td>
              </tr>
            </tbody>
          </table>
          <p className="text-muted" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.6 }}>
            신규 가입도 가능합니다. 앱은 이 서버에 연결되어 실제 데이터로 동작합니다.
          </p>
        </Section>

        <Section title="포함 기능">
          <ul style={{ paddingLeft: 18, fontSize: 13.5, lineHeight: 1.9, margin: 0 }}>
            <li>QR 정품 인증 · 기기 등록</li>
            <li>포인트 적립(등록·설문·주간 출석·개인정보 동의)과 경품·콘텐츠·할인 쿠폰 사용</li>
            <li>쿠폰 QR 제시 → 매장 결제에서 스캔·차감</li>
            <li>무상 교환(기본 1회 + 전체 참여 시 추가 1회)</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 34 }}>
      <h2 style={{ fontSize: 17, margin: "0 0 12px" }}>{title}</h2>
      {children}
    </div>
  );
}
