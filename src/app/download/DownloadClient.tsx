"use client";

import Link from "next/link";
import { useT, LangToggle, type Dict } from "@/lib/i18n/web";

const D: Dict = {
  builds: { ko: "역할별 설치", en: "Builds by role" },
  landing: { ko: "랜딩", en: "Home" },
  title: { ko: "역할별 빌드", en: "Builds by role" },
  intro: {
    ko: "현장·기기에서 쓰는 소비자·자판기·경찰 단말은 APK로 설치하고, 데스크톱에서 쓰는 관세청·운영자 콘솔은 브라우저로 접속합니다. QR을 폰으로 스캔하면 바로 설치/접속됩니다.",
    en: "Install the consumer, vending, and police field terminals used in the field as APKs; access the customs and operator consoles used on desktop via a browser. Scan a QR with your phone to install or open directly.",
  },
  apkSection: { ko: "앱 설치 (Android APK)", en: "App install (Android APK)" },
  webSection: { ko: "웹 콘솔 (설치 불필요)", en: "Web console (no install)" },
  demoSection: { ko: "시연 자료", en: "Demo materials" },
  appConsumerT: { ko: "ConiaMark · 소비자 앱", en: "ConiaMark · Consumer app" },
  appConsumerD: { ko: "QR 정품 인증 · 등록 · 포인트/쿠폰 · 무상 교환", en: "QR authentication · registration · points/coupons · free exchange" },
  appKioskT: { ko: "매장 자판기 단말", en: "Store vending terminal" },
  appKioskD: { ko: "무인 셀프 구매(정품·연령 확인) + 직원 POS(쿠폰 QR 스캔·결제)", en: "Unmanned self-purchase (authenticity + age check) + staff POS (coupon QR scan · payment)" },
  appKioskLogin: { ko: "직원 모드: staff@mm014.test", en: "Staff mode: staff@mm014.test" },
  appFieldT: { ko: "경찰 현장 단말", en: "Police field terminal" },
  appFieldD: { ko: "현장 UID 조회 · 압수 근거 판정 · 조서 발행", en: "On-site UID lookup · seizure verdict · report issuance" },
  webBocT: { ko: "관세청 · DTI 콘솔", en: "Customs · DTI console" },
  webBocD: { ko: "통관·유통 관제, 밀수 알림, 원장 무결성, 감사 로그", en: "Customs/distribution control, smuggling alerts, ledger integrity, audit log" },
  webAdminT: { ko: "플랫폼 운영자 콘솔", en: "Platform operator console" },
  webAdminD: { ko: "LOT 발급·라벨, 계정 관리, 앵커링·감사", en: "LOT issuance/labels, account management, anchoring & audit" },
  docRunsheetT: { ko: "10분 시연 런시트", en: "10-min demo run sheet" },
  docRunsheetD: { ko: "7단계 진행표 · 멘트 · 클릭 순서 · 계정 (리허설·준비용)", en: "7-step schedule · script · click order · accounts (for rehearsal/prep)" },
  docCheatT: { ko: "시연 치트시트 (1장)", en: "Demo cheat sheet (1 page)" },
  docCheatD: { ko: "시간·핵심 클릭·킬러 멘트 한눈 요약 (발표 당일용)", en: "Timing, key clicks, and killer lines at a glance (for presentation day)" },
  acctSection: { ko: "접속 계정", en: "Access accounts" },
  acctT: { ko: "업무별 접속 계정 안내", en: "Access accounts by role" },
  acctD: { ko: "역할별 로그인 이메일·공통 비밀번호·이동 화면 (이메일/비번 복사 버튼 포함)", en: "Login email, shared password, and destination screen per role (with copy buttons)" },
  scanOpen: { ko: "폰으로 QR 스캔", en: "Scan QR with phone" },
  open: { ko: "열기", en: "Open" },
  download: { ko: "다운로드", en: "Download" },
  apkDownload: { ko: "APK 다운로드", en: "Download APK" },
  scanInstall: { ko: "폰으로 QR 스캔 설치", en: "Scan QR with phone to install" },
  openConsole: { ko: "콘솔 열기", en: "Open console" },
  browserAccess: { ko: "브라우저 접속", en: "Browser access" },
  howTitle: { ko: "APK 설치 방법 (Android)", en: "How to install the APK (Android)" },
  how1: { ko: "역할 카드의 QR을 폰으로 스캔하거나 ‘APK 다운로드’를 누릅니다.", en: "Scan the QR on a role card with your phone, or tap ‘Download APK’." },
  how2: { ko: "다운로드한 APK를 실행합니다.", en: "Open the downloaded APK." },
  how3: { ko: "‘출처를 알 수 없는 앱 설치’를 요청하면 허용합니다.", en: "Allow ‘install from unknown sources’ if prompted." },
  how4: { ko: "설치 후 실행하고 위 계정으로 로그인합니다(자판기 무인 화면은 로그인 불필요).", en: "After installing, launch and sign in with the accounts above (the vending unmanned screen needs no login)." },
  footNote: { ko: "모든 빌드는 이 서버(클라우드)에 연결되어 동일한 실데이터로 동작합니다. 데모/파일럿 빌드입니다.", en: "All builds connect to this server (cloud) and run on the same live data. These are demo/pilot builds." },
};

export function DownloadClient({
  qConsumer,
  qKiosk,
  qField,
  qConsole,
  qAccounts,
}: {
  qConsumer: string;
  qKiosk: string;
  qField: string;
  qConsole: string;
  qAccounts: string;
}) {
  const t = useT(D);

  return (
    <div style={{ minHeight: "100vh" }}>
      <div className="nav" style={{ borderBottom: "1px solid var(--color-divider)", padding: "0 32px", height: 64, gap: 16 }}>
        <span className="nav-brand" style={{ fontSize: 17, letterSpacing: "0.12em" }}>
          LEDGERMARK
        </span>
        <span style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent-700)", border: "1px solid var(--color-divider)", padding: "2px 8px" }}>
          BUILDS · {t("builds")}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/" style={{ fontSize: 13 }}>
            {t("landing")}
          </Link>
          <LangToggle />
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "40px 24px 80px" }}>
        <h1 style={{ fontSize: 28, margin: "0 0 8px" }}>{t("title")}</h1>
        <p className="text-muted" style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 28px" }}>
          {t("intro")}
        </p>

        <h2 style={{ fontSize: 17, margin: "0 0 14px" }}>{t("apkSection")}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
          <AppCard
            title={t("appConsumerT")}
            desc={t("appConsumerD")}
            apk="/download/ledgermark-consumer.apk"
            qrSvg={qConsumer}
            login="ramon@demo.ph / ledgermark1234"
            t={t}
          />
          <AppCard
            title={t("appKioskT")}
            desc={t("appKioskD")}
            apk="/download/ledgermark-kiosk.apk"
            qrSvg={qKiosk}
            login={t("appKioskLogin")}
            t={t}
          />
          <AppCard
            title={t("appFieldT")}
            desc={t("appFieldD")}
            apk="/download/ledgermark-field.apk"
            qrSvg={qField}
            login="officer@pnp.test / ledgermark1234"
            t={t}
          />
        </div>

        <h2 style={{ fontSize: 17, margin: "36px 0 14px" }}>{t("webSection")}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
          <WebCard
            title={t("webBocT")}
            desc={t("webBocD")}
            href="/console"
            qrSvg={qConsole}
            login="inspector@boc.test / ledgermark1234"
            t={t}
          />
          <WebCard
            title={t("webAdminT")}
            desc={t("webAdminD")}
            href="/console"
            qrSvg={qConsole}
            login="admin@ledgermark.test / ledgermark1234"
            t={t}
          />
        </div>

        <h2 style={{ fontSize: 17, margin: "36px 0 14px" }}>{t("demoSection")}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
          <div className="blueprint" style={{ padding: 18, background: "transparent" }}>
            <div className="card-kicker">DOC</div>
            <h3 style={{ fontSize: 16, margin: "4px 0 6px" }}>{t("docRunsheetT")}</h3>
            <p className="text-muted" style={{ fontSize: 12.5, lineHeight: 1.55, margin: "0 0 12px" }}>
              {t("docRunsheetD")}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <a href="/download/demo-runsheet.html" target="_blank" className="btn btn-secondary" style={{ height: 38, display: "inline-flex", alignItems: "center", padding: "0 14px", fontSize: 13 }}>
                {t("open")}
              </a>
              <a href="/download/demo-runsheet.html" download className="btn btn-primary" style={{ height: 38, display: "inline-flex", alignItems: "center", padding: "0 14px", fontSize: 13 }}>
                {t("download")}
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
            <h3 style={{ fontSize: 16, margin: "4px 0 6px" }}>{t("docCheatT")}</h3>
            <p className="text-muted" style={{ fontSize: 12.5, lineHeight: 1.55, margin: "0 0 12px" }}>
              {t("docCheatD")}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <a href="/download/demo-cheatsheet.html" target="_blank" className="btn btn-secondary" style={{ height: 38, display: "inline-flex", alignItems: "center", padding: "0 14px", fontSize: 13 }}>
                {t("open")}
              </a>
              <a href="/download/demo-cheatsheet.html" download className="btn btn-primary" style={{ height: 38, display: "inline-flex", alignItems: "center", padding: "0 14px", fontSize: 13 }}>
                {t("download")}
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

        <h2 style={{ fontSize: 17, margin: "36px 0 14px" }}>{t("acctSection")}</h2>
        <div className="blueprint" style={{ padding: 18, background: "transparent" }}>
          <div className="card-kicker">DOC</div>
          <h3 style={{ fontSize: 16, margin: "4px 0 6px" }}>{t("acctT")}</h3>
          <p className="text-muted" style={{ fontSize: 12.5, lineHeight: 1.55, margin: "0 0 12px" }}>
            {t("acctD")}
          </p>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ width: 96, height: 96, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: qAccounts }} />
            <div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a href="/download/login-accounts.html" target="_blank" className="btn btn-secondary" style={{ height: 38, display: "inline-flex", alignItems: "center", padding: "0 14px", fontSize: 13 }}>
                  {t("open")}
                </a>
                <a href="/download/login-accounts.html" download className="btn btn-primary" style={{ height: 38, display: "inline-flex", alignItems: "center", padding: "0 14px", fontSize: 13 }}>
                  {t("download")}
                </a>
              </div>
              <p className="text-muted" style={{ fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
                {t("scanOpen")}
              </p>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 36 }}>
          <h2 style={{ fontSize: 17, margin: "0 0 12px" }}>{t("howTitle")}</h2>
          <ol style={{ paddingLeft: 18, fontSize: 13.5, lineHeight: 1.9, margin: 0 }}>
            <li>{t("how1")}</li>
            <li>{t("how2")}</li>
            <li>{t("how3")}</li>
            <li>{t("how4")}</li>
          </ol>
          <p className="text-muted" style={{ fontSize: 12, marginTop: 12, lineHeight: 1.6 }}>
            {t("footNote")}
          </p>
        </div>
      </div>
    </div>
  );
}

function AppCard({ title, desc, apk, qrSvg, login, t }: { title: string; desc: string; apk: string; qrSvg: string; login: string; t: (k: string) => string }) {
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
            {t("apkDownload")}
          </a>
          <p className="text-muted" style={{ fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
            {t("scanInstall")}
            <br />
            {login}
          </p>
        </div>
      </div>
    </div>
  );
}

function WebCard({ title, desc, href, qrSvg, login, t }: { title: string; desc: string; href: string; qrSvg: string; login: string; t: (k: string) => string }) {
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
            {t("openConsole")}
          </Link>
          <p className="text-muted" style={{ fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
            {t("browserAccess")}
            <br />
            {login}
          </p>
        </div>
      </div>
    </div>
  );
}
