"use client";

import { useEffect, useState } from "react";
import { Corners } from "@/components/ui/Corners";
import { useT, useLang, type Dict } from "@/lib/i18n/web";

interface ExchangeData {
  totalExchanges: number;
  totalUids: number;
  products: { productName: string; count: number }[];
  recent: { product: string; lot: string; at: string }[];
}

const D: Dict = {
  loading: { ko: "하자·교환 집계 중...", en: "Aggregating defects & exchanges...", fil: "Kinukuwenta ang depekto at palitan..." },
  title: { ko: "하자·교환 현황", en: "Defect & exchange status", fil: "Katayuan ng depekto at palitan" },
  sub: { ko: "코니아랩 제품을 독점 판매하는 총판이 제품의 불량/색상 교환(하자) 건수를 확인합니다. 교환 1건 = 하자 1건입니다.", en: "The exclusive distributor of Conia Lab's products tracks defect/color exchange counts. One exchange = one defect.", fil: "Sinusubaybayan ng eksklusibong distributor ng Conia Lab ang bilang ng palitan dahil sa depekto/kulay. Isang palitan = isang depekto." },
  totalExchanges: { ko: "총 교환(하자) 건수", en: "Total exchanges (defects)", fil: "Kabuuang palitan (depekto)" },
  rate: { ko: "발급 UID 대비 하자율", en: "Defect rate vs issued UIDs", fil: "Rate ng depekto vs. inilabas na UID" },
  byProduct: { ko: "제품별 하자·교환 건수", en: "Exchanges by product", fil: "Palitan ayon sa produkto" },
  product: { ko: "제품", en: "Product", fil: "Produkto" },
  count: { ko: "교환(하자) 건수", en: "Exchanges (defects)", fil: "Palitan (depekto)" },
  none: { ko: "아직 교환(하자) 이력이 없습니다.", en: "No exchanges (defects) yet.", fil: "Wala pang palitan (depekto)." },
  recent: { ko: "최근 교환 이력", en: "Recent exchanges", fil: "Mga kamakailang palitan" },
  when: { ko: "일시", en: "When", fil: "Kailan" },
};

export function ExchangeStats() {
  const t = useT(D);
  const lang = useLang();
  const [data, setData] = useState<ExchangeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/console/exchanges")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading || !data) return <p className="text-muted">{t("loading")}</p>;

  const rate = data.totalUids ? ((data.totalExchanges / data.totalUids) * 100).toFixed(2) : "0";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      <div>
        <h2 style={{ fontSize: 24, margin: "0 0 6px" }}>{t("title")}</h2>
        <p className="text-muted" style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0, maxWidth: "62ch" }}>
          {t("sub")}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
        <div className="blueprint" style={{ padding: 20, background: "transparent" }}>
          <Corners />
          <div className="card-kicker">{t("totalExchanges")}</div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 40, lineHeight: 1, marginTop: 6 }}>
            {data.totalExchanges.toLocaleString()}
          </div>
        </div>
        <div className="blueprint" style={{ padding: 20, background: "transparent" }}>
          <Corners />
          <div className="card-kicker">{t("rate")}</div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 40, lineHeight: 1, marginTop: 6 }}>
            {rate}%
          </div>
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>{t("byProduct")}</h3>
        {data.products.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 13 }}>{t("none")}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t("product")}</th>
                <th style={{ textAlign: "right" }}>{t("count")}</th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((p) => (
                <tr key={p.productName}>
                  <td>{p.productName}</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-heading)" }}>{p.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data.recent.length > 0 && (
        <div>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>{t("recent")}</h3>
          <table className="table">
            <thead>
              <tr>
                <th>{t("product")}</th>
                <th>LOT</th>
                <th>{t("when")}</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((r, i) => (
                <tr key={i}>
                  <td>{r.product}</td>
                  <td style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12 }}>{r.lot}</td>
                  <td style={{ fontSize: 12 }}>{new Date(r.at).toLocaleString(lang === "en" ? "en-US" : "ko-KR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
