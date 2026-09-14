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
  const svg = await QRCode.toString(`${SITE}${path}`, {
    type: "svg",
    margin: 2, // 스캔 안정용 quiet zone
    width: 128,
    color: { dark: "#0E1116", light: "#ffffff" }, // 흰 배경 고정(투명 배경은 스캔 실패 원인)
  });
  // 고정 width/height 속성을 100%로 바꿔 컨테이너 크기에 맞춰 스케일되게 한다.
  // (기존엔 132px SVG가 96px 박스를 넘쳐 버튼·계정 텍스트와 겹쳤다.)
  // QRCode svg는 루트 <svg>에만 width/height를 두므로 각각 독립 치환해도 안전하다.
  return svg.replace(/\swidth="\d+"/, ' width="100%"').replace(/\sheight="\d+"/, ' height="100%"');
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
