"use client";

import { useEffect, useState } from "react";
import { Corners } from "@/components/ui/Corners";
import { Tag } from "@/components/ui/Tag";
import { useT, useLang, type Dict } from "@/lib/i18n/web";

interface CustomsSummary {
  importedUnits: number;
  totalUnits: number;
  taxPerUnitPhp: number;
  taxTotalPhp: number;
  assumption: boolean;
  byStatus: Record<string, number>;
}

const D: Dict = {
  loading: { ko: "수입·세금 집계 중...", en: "Aggregating imports & tax...", fil: "Kinukuwenta ang imports at buwis..." },
  title: { ko: "수입 통관 요약", en: "Import & customs summary", fil: "Buod ng import at customs" },
  sub: { ko: "코니아랩 독점 생산·공급권 제품의 수입 물량과 납부 세금을 확인합니다.", en: "Imported volume and tax paid for products under Conia Lab's exclusive production/supply rights.", fil: "Dami ng na-import at buwis na binayaran para sa mga produktong nasa ilalim ng eksklusibong karapatan ng Conia Lab." },
  imported: { ko: "수입 상품 수량", en: "Imported units", fil: "Na-import na yunit" },
  importedNote: { ko: "생산 후 필리핀으로 수입된 정품 수량", en: "Authentic units imported into the Philippines after production", fil: "Bilang ng tunay na yunit na na-import sa Pilipinas pagkatapos ng produksyon" },
  taxPaid: { ko: "납부 세금 (누계)", en: "Tax paid (cumulative)", fil: "Buwis na binayaran (kabuuan)" },
  taxNote: { ko: "개당 ₱{n} 기준", en: "at ₱{n} per unit", fil: "sa ₱{n} kada yunit" },
  assumptionBadge: { ko: "가정값 — 실제 세율 반영 전", en: "Assumed — pending real tax rate", fil: "Palagay — hindi pa aktwal na tax rate" },
  distTitle: { ko: "수입 후 유통 단계별 수량", en: "Units by post-import stage", fil: "Yunit ayon sa yugto pagkatapos ng import" },
  total: { ko: "전체 발급 UID", en: "Total issued UIDs", fil: "Kabuuang inilabas na UID" },
  stMINTED: { ko: "생산 발급 (수입 전)", en: "Minted (pre-import)", fil: "Minted (bago mag-import)" },
  stEXPORTED: { ko: "수입 완료", en: "Imported", fil: "Na-import" },
  stWHOLESALE: { ko: "총판 배분", en: "Wholesale", fil: "Wholesale" },
  stRETAIL_SOLD: { ko: "소비자 판매", en: "Retail sold", fil: "Naibenta sa retail" },
  stEXCHANGED: { ko: "교환됨", en: "Exchanged", fil: "Napalitan" },
  stRESOLD: { ko: "중고 거래됨", en: "Resold", fil: "Naibentang muli" },
};

const STATUS_ORDER = ["MINTED", "EXPORTED", "WHOLESALE", "RETAIL_SOLD", "EXCHANGED", "RESOLD"];

export function CustomsView() {
  const t = useT(D);
  const lang = useLang();
  const [data, setData] = useState<CustomsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/customs/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading || !data) return <p className="text-muted">{t("loading")}</p>;

  const peso = (n: number) => `₱${n.toLocaleString(lang === "ko" ? "ko-KR" : "en-US")}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      <div>
        <h2 style={{ fontSize: 26, margin: "0 0 6px" }}>{t("title")}</h2>
        <p className="text-muted" style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0, maxWidth: "60ch" }}>
          {t("sub")}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
        <div className="blueprint" style={{ padding: 20, background: "transparent" }}>
          <Corners />
          <div className="card-kicker">{t("imported")}</div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 40, lineHeight: 1, marginTop: 6 }}>
            {data.importedUnits.toLocaleString()}
          </div>
          <div className="text-muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
            {t("importedNote")}
          </div>
        </div>

        <div className="blueprint" style={{ padding: 20, background: "transparent", borderColor: "var(--color-accent)" }}>
          <Corners />
          <div className="card-kicker">{t("taxPaid")}</div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 40, lineHeight: 1, marginTop: 6 }}>
            {peso(data.taxTotalPhp)}
          </div>
          <div className="text-muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
            {t("taxNote", { n: data.taxPerUnitPhp.toLocaleString() })}
          </div>
          {data.assumption && (
            <div style={{ marginTop: 10 }}>
              <Tag variant="neutral">{t("assumptionBadge")}</Tag>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>{t("distTitle")}</h3>
        <table className="table">
          <tbody>
            <tr>
              <td>{t("total")}</td>
              <td style={{ textAlign: "right", fontFamily: "var(--font-heading)" }}>{data.totalUnits.toLocaleString()}</td>
            </tr>
            {STATUS_ORDER.map((s) => (
              <tr key={s}>
                <td>{t(`st${s}`)}</td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-heading)" }}>
                  {(data.byStatus[s] ?? 0).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
