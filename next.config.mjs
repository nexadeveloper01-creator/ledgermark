/** @type {import('next').NextConfig} */

// APK는 저장소에 두지 않고 GitHub Releases에서 배포한다(파일당 70MB+).
// `releases/latest/download/<파일명>` 형태라 새 릴리스를 올리면 코드 수정 없이 최신본이 나간다.
// 배포처를 옮길 경우 APK_RELEASE_BASE 만 바꾸면 된다.
const APK_BASE =
  process.env.APK_RELEASE_BASE ||
  "https://github.com/nexadeveloper01-creator/ledgermark/releases/latest/download";

const APKS = ["ledgermark-consumer.apk", "ledgermark-kiosk.apk", "ledgermark-field.apk"];

const nextConfig = {
  reactStrictMode: true,
  // /download/*.apk 경로를 유지해 이미 배포된 QR·링크가 그대로 동작하게 한다.
  async redirects() {
    return APKS.map((file) => ({
      source: `/download/${file}`,
      destination: `${APK_BASE}/${file}`,
      permanent: false,
    }));
  },
};

export default nextConfig;
