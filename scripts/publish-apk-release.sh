#!/usr/bin/env bash
# APK를 GitHub Releases로 배포한다.
#
# APK는 저장소에 커밋하지 않는다(파일당 70MB+, GitHub 권장 한도 50MB / 하드 리밋 100MB).
# 웹의 /download/*.apk 경로는 next.config.mjs 리다이렉트가
# `releases/latest/download/<파일명>` 으로 넘겨주므로,
# 새 빌드를 올릴 때 이 스크립트로 새 릴리스만 만들면 링크·QR은 그대로 동작한다.
#
# 사전 준비: gh auth login
# 사용법:   bash scripts/publish-apk-release.sh [태그]
#           bash scripts/publish-apk-release.sh apk-v1.0.1

set -euo pipefail

TAG="${1:-apk-v$(date +%Y.%m.%d)}"
DIR="public/download"
APKS=(ledgermark-consumer.apk ledgermark-kiosk.apk ledgermark-field.apk)

# 웹에서 참조하지 않는 과거 클라우드 빌드. 저장소에서 빼는 대신 릴리스에 보관한다.
EXTRA=(ledgermark-consumer-cloud.apk)

FILES=()
for f in "${APKS[@]}"; do
  [ -f "$DIR/$f" ] || { echo "없음: $DIR/$f — 먼저 APK를 빌드하세요." >&2; exit 1; }
  FILES+=("$DIR/$f")
done
for f in "${EXTRA[@]}"; do
  [ -f "$f" ] && FILES+=("$f")
done

gh auth status >/dev/null 2>&1 || { echo "gh 로그인이 필요합니다: gh auth login" >&2; exit 1; }

NOTES="LEDGERMARK / ConiaMark 파일럿 APK

| 역할 | 파일 |
| --- | --- |
| 소비자 (ConiaMark) | ledgermark-consumer.apk |
| 매장 자판기 | ledgermark-kiosk.apk |
| 경찰 현장 | ledgermark-field.apk |

설치 링크는 /download 페이지의 QR을 그대로 사용하면 됩니다."

if gh release view "$TAG" >/dev/null 2>&1; then
  echo "기존 릴리스 $TAG 에 자산을 덮어씁니다."
  gh release upload "$TAG" "${FILES[@]}" --clobber
else
  gh release create "$TAG" "${FILES[@]}" \
    --title "APK $TAG" \
    --notes "$NOTES" \
    --latest
fi

echo
echo "완료. 최신 릴리스 기준 다운로드 URL:"
for f in "${APKS[@]}"; do
  echo "  https://github.com/nexadeveloper01-creator/ledgermark/releases/latest/download/$f"
done
