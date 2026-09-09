import QRCode from "qrcode";
import { DownloadClient } from "./DownloadClient";

// 역할별 빌드 허브(퍼블리싱) — 공개 페이지.
//  APK: 소비자 / 매장 자판기 / 경찰 현장   |   웹 콘솔: 관세청 / 운영자
// QR은 서버에서 생성하고, UI/다국어는 클라이언트 컴포넌트가 담당한다.
export const metadata = {
  title: "LEDGERMARK · 역할별 빌드 / Builds",
  description: "역할별 앱 설치와 콘솔 접속 · Install apps and access consoles by role",
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
  const [qConsumer, qKiosk, qField, qConsole, qAccounts] = await Promise.all([
    qr("/download/ledgermark-consumer.apk"),
    qr("/download/ledgermark-kiosk.apk"),
    qr("/download/ledgermark-field.apk"),
    qr("/console"),
    qr("/download/login-accounts.html"),
  ]);

  return (
    <DownloadClient
      qConsumer={qConsumer}
      qKiosk={qKiosk}
      qField={qField}
      qConsole={qConsole}
      qAccounts={qAccounts}
    />
  );
}
