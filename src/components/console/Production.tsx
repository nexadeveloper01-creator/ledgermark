"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Corners } from "@/components/ui/Corners";
import { Tag } from "@/components/ui/Tag";

import { useT, type Dict } from "@/lib/i18n/web";

const D: Dict = {
  fail: { ko: "LOT 발급에 실패했습니다.", en: "Lot minting failed." },
  minted: { ko: "LOT {code} 발급 완료 — UID {n}개 생성.", en: "Lot {code} minted — {n} UIDs created." },
  mintTitle: { ko: "LOT 발급 (UID 일괄 MINT)", en: "Mint lot (batch UID)" },
  lotCode: { ko: "LOT 코드", en: "Lot code" },
  product: { ko: "제품명", en: "Product name" },
  qty: { ko: "수량", en: "Quantity" },
  producer: { ko: "생산 법인", en: "Producer" },
  mint: { ko: "발급", en: "Mint" },
  mintNote: { ko: "발급 시 각 UID가 생산 법인 소유로 MINT되고 원장에 기록됩니다. 이후 라벨 인쇄로 QR을 출력합니다.", en: "On mint, each UID is created under the producer and recorded on the ledger. Print QR labels afterward." },
  thProduct: { ko: "제품", en: "Product" },
  thQty: { ko: "수량", en: "Qty" },
  thProducer: { ko: "생산 법인", en: "Producer" },
  thMinted: { ko: "발급 시각", en: "Minted" },
  thLabel: { ko: "라벨", en: "Label" },
  printLabels: { ko: "QR 라벨 인쇄", en: "Print QR labels" },
  noLots: { ko: "발급된 LOT이 없습니다.", en: "No lots minted yet." },
};

// 생산 단계: LOT을 발급(UID 일괄 MINT)하고, 각 LOT의 UID QR 라벨 시트를 인쇄한다.
export function Production({ canMint }: { canMint: boolean }) {
  const t = useT(D);
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
      setError(body.error ?? t("fail"));
      return;
    }
    setMessage(t("minted", { code, n: body.uidCount.toLocaleString() }));
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
          <div className="card-kicker">{t("mintTitle")}</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginTop: 10 }}>
            <div className="field" style={{ minWidth: 160 }}>
              <label>{t("lotCode")}</label>
              <input className="input" placeholder="PH-2610-A" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="field" style={{ minWidth: 180 }}>
              <label>{t("product")}</label>
              <input className="input" placeholder="Series V · Graphite" value={productName} onChange={(e) => setProductName(e.target.value)} />
            </div>
            <div className="field" style={{ width: 110 }}>
              <label>{t("qty")}</label>
              <input className="input" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="field" style={{ minWidth: 200 }}>
              <label>{t("producer")}</label>
              <select className="input" value={producerOrgId} onChange={(e) => setProducerOrgId(e.target.value)}>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="primary" onClick={mint}>
              {t("mint")}
            </Button>
          </div>
          <div style={{ fontSize: 11, marginTop: 10 }} className="text-muted">
            {t("mintNote")}
          </div>
        </div>
      )}

      {message && <p style={{ fontSize: 13, color: "var(--color-accent-700)" }}>{message}</p>}
      {error && <p style={{ fontSize: 13, color: "var(--color-accent-700)" }}>{error}</p>}

      <table className="table">
        <thead>
          <tr>
            <th>LOT</th>
            <th>{t("thProduct")}</th>
            <th>{t("thQty")}</th>
            <th>{t("thProducer")}</th>
            <th>{t("thMinted")}</th>
            <th>{t("thLabel")}</th>
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
                  {t("printLabels")}
                </Button>
              </td>
            </tr>
          ))}
          {lots.length === 0 && (
            <tr>
              <td colSpan={6} className="text-muted">
                {t("noLots")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
