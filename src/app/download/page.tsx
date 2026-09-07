import Link from "next/link";
import QRCode from "qrcode";

// 역할별 빌드 허브(퍼블리싱) — 공개 페이지.
//  APK: 소비자 / 매장 자판기 / 경찰 현장   |   웹 콘솔: 관세청 / 운영자
export const metadata = {
  title: "LEDGERMARK 설치 · 빌드",
  description: "역할별 앱 설치와 콘솔 접속",
};

const SITE = process.env.APP_BASE_URL || "https://app-production-daca.up.railway.app";

async function qr(path: string) {
  return QRCode.toString(`${SITE}${path}`, {
    type: "svg",
    margin: 1,
    width: 132,
    color: { dark: "#0E1116", light: "#00000000" },
  });
}

export default async function DownloadPage() {
  const [qConsumer, qKiosk, qField, qConsole] = await Promise.all([
    qr("/download/ledgermark-consumer.apk"),
    qr("/download/ledgermark-kiosk.apk"),
    qr("/download/ledgermark-field.apk"),
    qr("/console"),
  ]);

  return (
    <div style={{ minHeight: "100vh" }}>
      <div className="nav" style={{ borderBottom: "1px solid var(--color-divider)", padding: "0 32px", height: 64, gap: 16 }}>
        <span className="nav-brand" style={{ fontSize: 17, letterSpacing: "0.12em" }}>
          LEDGERMARK
        </span>
        <span style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent-700)", border: "1px solid var(--color-divider)", padding: "2px 8px" }}>
          BUILDS · 역할별 설치
        </span>
        <div style={{ marginLeft: "auto" }}>
          <Link href="/" style={{ fontSize: 13 }}>
            랜딩
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 24px 80px" }}>
        <h1 style={{ fontSize: 28, margin: "0 0 8px" }}>역할별 빌드</h1>
        <p className="text-muted" style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 28px" }}>
          현장·기기에서 쓰는 소비자·자판기·경찰 단말은 APK로 설치하고, 데스크톱에서 쓰는 관세청·운영자
          콘솔은 브라우저로 접속합니다. QR을 폰으로 스캔하면 바로 설치/접속됩니다.
        </p>

        <h2 style={{ fontSize: 17, margin: "0 0 14px" }}>앱 설치 (Android APK)</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
          <AppCard
            title="일반 사용자 앱"
            desc="QR 정품 인증 · 등록 · 포인트/쿠폰 · 무상 교환"
            apk="/download/ledgermark-consumer.apk"
            qrSvg={qConsumer}
            login="ramon@demo.ph / ledgermark1234"
          />
          <AppCard
            title="매장 자판기 단말"
            desc="무인 셀프 구매(정품·연령 확인) + 직원 POS(쿠폰 QR 스캔·결제)"
            apk="/download/ledgermark-kiosk.apk"
            qrSvg={qKiosk}
            login="직원 모드: staff@mm014.test"
          />
          <AppCard
            title="경찰 현장 단말"
            desc="현장 UID 조회 · 압수 근거 판정 · 조서 발행"
            apk="/download/ledgermark-field.apk"
            qrSvg={qField}
            login="officer@pnp.test / ledgermark1234"
          />
        </div>

        <h2 style={{ fontSize: 17, margin: "36px 0 14px" }}>웹 콘솔 (설치 불필요)</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
          <WebCard
            title="관세청 · DTI 콘솔"
            desc="통관·유통 관제, 밀수 알림, 원장 무결성, 시장분석"
            href="/console"
            qrSvg={qConsole}
            login="inspector@boc.test / ledgermark1234"
          />
          <WebCard
            title="플랫폼 운영자 콘솔"
            desc="LOT 발급·라벨, 계정 관리, 앵커링, AI 시장분석"
            href="/console"
            qrSvg={qConsole}
            login="admin@ledgermark.test / ledgermark1234"
          />
        </div>

        <h2 style={{ fontSize: 17, margin: "36px 0 14px" }}>시연 자료</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
          <div className="blueprint" style={{ padding: 18, background: "transparent" }}>
            <div className="card-kicker">DOC</div>
            <h3 style={{ fontSize: 16, margin: "4px 0 6px" }}>10분 시연 런시트</h3>
            <p className="text-muted" style={{ fontSize: 12.5, lineHeight: 1.55, margin: "0 0 12px" }}>
              7단계 진행표 · 멘트 · 클릭 순서 · 계정 (리허설·준비용)
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <a href="/download/demo-runsheet.html" target="_blank" className="btn btn-secondary" style={{ height: 38, display: "inline-flex", alignItems: "center", padding: "0 14px", fontSize: 13 }}>
                열기
              </a>
              <a href="/download/demo-runsheet.html" download className="btn btn-primary" style={{ height: 38, display: "inline-flex", alignItems: "center", padding: "0 14px", fontSize: 13 }}>
                다운로드
              </a>
            </div>
            <p style={{ fontSize: 12, marginTop: 10, marginBottom: 0 }} className="text-muted">
              English:{" "}
              <a href="/download/demo-runsheet-en.html" target="_blank">Open</a>
              {" · "}
              <a href="/download/demo-runsheet-en.html" download>Download</a>
            </p>
          </div>
          <div className="blueprint" style={{ padding: 18, background: "transparent" }}>
            <div className="card-kicker">DOC</div>
            <h3 style={{ fontSize: 16, margin: "4px 0 6px" }}>시연 치트시트 (1장)</h3>
            <p className="text-muted" style={{ fontSize: 12.5, lineHeight: 1.55, margin: "0 0 12px" }}>
              시간·핵심 클릭·킬러 멘트 한눈 요약 (발표 당일용)
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <a href="/download/demo-cheatsheet.html" target="_blank" className="btn btn-secondary" style={{ height: 38, display: "inline-flex", alignItems: "center", padding: "0 14px", fontSize: 13 }}>
                열기
              </a>
              <a href="/download/demo-cheatsheet.html" download className="btn btn-primary" style={{ height: 38, display: "inline-flex", alignItems: "center", padding: "0 14px", fontSize: 13 }}>
                다운로드
              </a>
            </div>
            <p style={{ fontSize: 12, marginTop: 10, marginBottom: 0 }} className="text-muted">
              English:{" "}
              <a href="/download/demo-cheatsheet-en.html" target="_blank">Open</a>
              {" · "}
              <a href="/download/demo-cheatsheet-en.html" download>Download</a>
            </p>
          </div>
        </div>

        <div style={{ marginTop: 36 }}>
          <h2 style={{ fontSize: 17, margin: "0 0 12px" }}>APK 설치 방법 (Android)</h2>
          <ol style={{ paddingLeft: 18, fontSize: 13.5, lineHeight: 1.9, margin: 0 }}>
            <li>역할 카드의 QR을 폰으로 스캔하거나 &lsquo;APK 다운로드&rsquo;를 누릅니다.</li>
            <li>다운로드한 APK를 실행합니다.</li>
            <li>&lsquo;출처를 알 수 없는 앱 설치&rsquo;를 요청하면 허용합니다.</li>
            <li>설치 후 실행하고 위 계정으로 로그인합니다(자판기 무인 화면은 로그인 불필요).</li>
          </ol>
          <p className="text-muted" style={{ fontSize: 12, marginTop: 12, lineHeight: 1.6 }}>
            모든 빌드는 이 서버(클라우드)에 연결되어 동일한 실데이터로 동작합니다. 데모/파일럿 빌드입니다.
          </p>
        </div>
      </div>
    </div>
  );
}

function AppCard({ title, desc, apk, qrSvg, login }: { title: string; desc: string; apk: string; qrSvg: string; login: string }) {
  return (
    <div className="blueprint" style={{ padding: 18, background: "transparent" }}>
      <div className="card-kicker">APK</div>
      <h3 style={{ fontSize: 17, margin: "4px 0 6px" }}>{title}</h3>
      <p className="text-muted" style={{ fontSize: 12.5, lineHeight: 1.55, minHeight: 54, margin: 0 }}>
        {desc}
      </p>
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 12 }}>
        <div style={{ width: 96, height: 96, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <div>
          <a href={apk} className="btn btn-primary" style={{ height: 40, display: "inline-flex", alignItems: "center", padding: "0 16px", fontSize: 13 }}>
            APK 다운로드
          </a>
          <p className="text-muted" style={{ fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
            폰으로 QR 스캔 설치
            <br />
            {login}
          </p>
        </div>
      </div>
    </div>
  );
}

function WebCard({ title, desc, href, qrSvg, login }: { title: string; desc: string; href: string; qrSvg: string; login: string }) {
  return (
    <div className="blueprint" style={{ padding: 18, background: "transparent" }}>
      <div className="card-kicker">WEB</div>
      <h3 style={{ fontSize: 17, margin: "4px 0 6px" }}>{title}</h3>
      <p className="text-muted" style={{ fontSize: 12.5, lineHeight: 1.55, minHeight: 54, margin: 0 }}>
        {desc}
      </p>
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 12 }}>
        <div style={{ width: 96, height: 96, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <div>
          <Link href={href} className="btn btn-secondary" style={{ height: 40, display: "inline-flex", alignItems: "center", padding: "0 16px", fontSize: 13 }}>
            콘솔 열기
          </Link>
          <p className="text-muted" style={{ fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
            브라우저 접속
            <br />
            {login}
          </p>
        </div>
      </div>
    </div>
  );
}
