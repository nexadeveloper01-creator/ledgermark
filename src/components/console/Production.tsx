"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Corners } from "@/components/ui/Corners";
import { Tag } from "@/components/ui/Tag";

// 생산 단계: LOT을 발급(UID 일괄 MINT)하고, 각 LOT의 UID QR 라벨 시트를 인쇄한다.
export function Production({ canMint }: { canMint: boolean }) {
  const [lots, setLots] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("20");
  const [producerOrgId, setProducerOrgId] = useState("");

  const load = useCallback(async () => {
    const [l, o] = await Promise.all([
      fetch("/api/lots").then((r) => r.json()),
      fetch("/api/organizations").then((r) => r.json()),
    ]);
    setLots(l.lots ?? []);
    setOrgs(o.organizations ?? []);
    const producers = (o.organizations ?? []).filter((x: any) => x.type === "PRODUCER");
    setProducerOrgId((cur) => cur || producers[0]?.id || o.organizations?.[0]?.id || "");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const mint = async () => {
    setError(null);
    setMessage(null);
    const res = await fetch("/api/lots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.trim(),
        productName: productName.trim(),
        quantity: Number(quantity),
        producerOrgId,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? "LOT 발급에 실패했습니다.");
      return;
    }
    setMessage(`LOT ${code} 발급 완료 — UID ${body.uidCount.toLocaleString()}개 생성.`);
    setCode("");
    setProductName("");
    load();
  };

  const openLabels = (lotId: string) => {
    window.open(`/console/labels/${lotId}`, "_blank", "noopener");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {canMint && (
        <div className="blueprint" style={{ padding: 18, background: "transparent" }}>
          <Corners />
          <div className="card-kicker">LOT 발급 (UID 일괄 MINT)</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginTop: 10 }}>
            <div className="field" style={{ minWidth: 160 }}>
              <label>LOT 코드</label>
              <input className="input" placeholder="PH-2610-A" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="field" style={{ minWidth: 180 }}>
              <label>제품명</label>
              <input className="input" placeholder="Series V · Graphite" value={productName} onChange={(e) => setProductName(e.target.value)} />
            </div>
            <div className="field" style={{ width: 110 }}>
              <label>수량</label>
              <input className="input" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="field" style={{ minWidth: 200 }}>
              <label>생산 법인</label>
              <select className="input" value={producerOrgId} onChange={(e) => setProducerOrgId(e.target.value)}>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="primary" onClick={mint}>
              발급
            </Button>
          </div>
          <div style={{ fontSize: 11, marginTop: 10 }} className="text-muted">
            발급 시 각 UID가 생산 법인 소유로 MINT되고 원장에 기록됩니다. 이후 라벨 인쇄로 QR을 출력합니다.
          </div>
        </div>
      )}

      {message && <p style={{ fontSize: 13, color: "var(--color-accent-700)" }}>{message}</p>}
      {error && <p style={{ fontSize: 13, color: "var(--color-accent-700)" }}>{error}</p>}

      <table className="table">
        <thead>
          <tr>
            <th>LOT</th>
            <th>제품</th>
            <th>수량</th>
            <th>생산 법인</th>
            <th>발급 시각</th>
            <th>라벨</th>
          </tr>
        </thead>
        <tbody>
          {lots.map((l) => (
            <tr key={l.id}>
              <td style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12 }}>{l.code}</td>
              <td style={{ fontSize: 12 }}>{l.productName}</td>
              <td style={{ fontSize: 12 }}>
                <Tag variant="accent">{(l._count?.uids ?? l.quantity).toLocaleString()}</Tag>
              </td>
              <td style={{ fontSize: 12 }}>{l.producer?.name ?? "—"}</td>
              <td style={{ fontSize: 12 }}>{new Date(l.producedAt).toLocaleString("ko-KR")}</td>
              <td>
                <Button variant="ghost" style={{ fontSize: 12 }} onClick={() => openLabels(l.id)}>
                  QR 라벨 인쇄
                </Button>
              </td>
            </tr>
          ))}
          {lots.length === 0 && (
            <tr>
              <td colSpan={6} className="text-muted">
                발급된 LOT이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
