import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LEDGERMARK · 전자담배 유통 공정관리 / Vape Distribution Ledger",
  description:
    "생산부터 소비자 소유권 이전까지, UID 기반 소유권 상태머신과 허가형 원장으로 유통 전 과정을 추적합니다. " +
    "A permissioned, UID-based ownership ledger tracking regulated goods from production to consumer transfer.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
