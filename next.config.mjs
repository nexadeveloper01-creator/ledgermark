/** @type {import('next').NextConfig} */

// APK는 저장소에 두지 않고 GitHub Releases에서 배포한다(파일당 70MB+).
// `releases/latest/download/<파일명>` 형태라 새 릴리스를 올리면 코드 수정 없이 최신본이 나간다.
// 배포처를 옮길 경우 APK_RELEASE_BASE 만 바꾸면 된다.
const APK_BASE =
  process.env.APK_RELEASE_BASE ||
  "https://github.com/nexadeveloper01-creator/ledgermark/releases/latest/download";

// 소비자 앱만 APK로 배포한다. 매장 자판기·경찰 현장·관세청·운영자는 모두 브라우저로
// 시연하므로 터미널 APK(웹뷰 셸, 모바일 미최적화)는 배포에서 제외한다.
const APKS = ["ledgermark-consumer.apk"];

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
