"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { useSession } from "@/components/SessionBar";
import { Button } from "@/components/ui/Button";

// 인쇄용 QR 라벨 시트. 콘솔 크롬 없이 라벨만 렌더링해 브라우저 인쇄로 출력한다.
// QR에는 UID 코드 문자열을 그대로 담아 Flutter 스캐너가 바로 조회할 수 있게 한다.
interface Label {
  code: string;
  dataUrl: string;
}

export default function LabelSheetPage() {
  const { user, loading } = useSession(["ADMIN", "GOV_INSPECTOR"]);
  const lotId = useParams().lotId as string;

  const [lot, setLot] = useState<{ code: string; productName: string; quantity: number } | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [meta, setMeta] = useState<{ total: number; shown: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [building, setBuilding] = useState(true);

  const load = useCallback(async () => {
    setBuilding(true);
    setError(null);
    const res = await fetch(`/api/lots/${lotId}/uids`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "라벨 데이터를 불러오지 못했습니다.");
      setBuilding(false);
      return;
    }
    const body = await res.json();
    setLot(body.lot);
    setMeta({ total: body.total, shown: (body.codes as string[]).length });

    // QR을 클라이언트에서 생성해 서버가 수백 개의 이미지를 만들어 보내지 않도록 한다.
    const built: Label[] = [];
    for (const code of body.codes as string[]) {
      const dataUrl = await QRCode.toDataURL(code, { margin: 1, width: 240 });
      built.push({ code, dataUrl });
    }
    setLabels(built);
    setBuilding(false);
  }, [lotId]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (loading || !user) {
    return <p style={{ padding: 32, color: "var(--color-neutral-600)" }}>불러오는 중...</p>;
  }

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .sheet { padding: 0 !important; }
          @page { margin: 12mm; }
        }
      `}</style>

      <div
        className="no-print"
        style={{
          position: "sticky",
          top: 0,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "14px 24px",
          borderBottom: "1px solid var(--color-divider)",
          background: "var(--color-bg)",
        }}
      >
        <span style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.12em" }}>LEDGERMARK</span>
        <span style={{ fontSize: 12, color: "var(--color-accent-700)" }}>PRODUCTION LABELS</span>
        {lot && (
          <span style={{ fontSize: 13 }}>
            LOT {lot.code} · {lot.productName}
            {meta && (
              <span style={{ color: "var(--color-neutral-600)", marginLeft: 8 }}>
                {meta.shown.toLocaleString()} / {meta.total.toLocaleString()} 라벨
              </span>
            )}
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Button variant="secondary" onClick={() => window.close()}>
            닫기
          </Button>
          <Button variant="primary" onClick={() => window.print()} disabled={building || labels.length === 0}>
            인쇄 / PRINT
          </Button>
        </div>
      </div>

      {error && <p style={{ padding: 24, color: "var(--color-accent-700)" }}>{error}</p>}
      {building && <p style={{ padding: 24, color: "var(--color-neutral-600)" }}>QR 라벨 생성 중...</p>}

      {meta && meta.total > meta.shown && !building && (
        <p className="no-print" style={{ padding: "12px 24px 0", fontSize: 12, color: "var(--color-neutral-600)" }}>
          이 LOT은 {meta.total.toLocaleString()}개 UID 중 처음 {meta.shown.toLocaleString()}개만
          표시됩니다. 나머지는 `?skip=` 파라미터로 이어서 인쇄하세요.
        </p>
      )}

      <div
        className="sheet"
        style={{
          padding: 24,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 10,
        }}
      >
        {labels.map((l) => (
          <div
            key={l.code}
            style={{
              border: "1px solid #1d1f20",
              padding: 8,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              breakInside: "avoid",
              background: "#fff",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.dataUrl} alt={l.code} width={120} height={120} />
            <span style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 10, color: "#1d1f20" }}>
              {l.code}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
