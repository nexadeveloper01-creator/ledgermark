"use client";

import { useCallback, useEffect, useState } from "react";
import { Corners } from "@/components/ui/Corners";
import { Tag } from "@/components/ui/Tag";

interface Report {
  generatedAt: string;
  dateKey: string;
  market: {
    sizeUsdM: number;
    yoyGrowthPct: number;
    smokingPopM: number;
    vaperPenetrationPct: number;
    illicitSharePct: number;
    segments: { name: string; sharePct: number; growthPct: number }[];
    regions: { name: string; demandIndex: number; growthPct: number; ourSharePct: number }[];
  };
  ours: {
    registeredUids: number;
    totalUids: number;
    activeConsumers: number;
    weeklyActivePct: number;
    surveyResponses: number;
    sellThroughPct: number;
    ourSharePct: number;
    openAlerts: number;
  };
  comparison: { metric: string; market: string; ours: string; note: string }[];
  trend: { date: string; marketDemand: number; ourRegistrations: number }[];
  insights: { severity: "opportunity" | "risk" | "watch"; title: string; body: string }[];
  actions: { priority: string; title: string; body: string; expectedImpact: string }[];
  dataNote: string;
}

const SEVERITY: Record<"opportunity" | "risk" | "watch", { label: string; color: string }> = {
  opportunity: { label: "기회", color: "var(--color-accent)" },
  risk: { label: "리스크", color: "#D9642A" },
  watch: { label: "관찰", color: "var(--color-accent-700)" },
};

export function MarketIntel() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/market/insights");
    if (res.ok) setReport(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !report) return <p className="text-muted">시장 데이터를 분석하는 중...</p>;

  const m = report.market;
  const o = report.ours;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* 헤더: AI 자동 분석 배지 + 생성 시각 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Tag variant="accent">AI 자동 분석</Tag>
        <span style={{ fontSize: 13 }} className="text-muted">
          기준일 {report.dateKey} · 매일 자동 갱신 · 생성{" "}
          {new Date(report.generatedAt).toLocaleString("ko-KR")}
        </span>
        <button
          className="btn btn-ghost"
          style={{ marginLeft: "auto", fontSize: 12 }}
          onClick={load}
        >
          새로고침
        </button>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 20 }}>
        <Kpi label="시장 규모 (모델 추정)" value={`$${m.sizeUsdM}M`} meta={`vaper 침투율 ${m.vaperPenetrationPct}%`} />
        <Kpi label="시장 성장률 YoY" value={`${m.yoyGrowthPct}%`} accent />
        <Kpi label="무허가·밀수 비중" value={`${m.illicitSharePct}%`} meta="정품 인증으로 방어 가능" />
        <Kpi label="자사 정품 등록 (실측)" value={o.registeredUids.toLocaleString()} meta={`전환율 ${o.sellThroughPct}%`} />
        <Kpi label="앱 주간 활성 (실측)" value={`${o.weeklyActivePct}%`} meta={`설문 ${o.surveyResponses}건`} />
      </div>

      {/* 추세 + 세그먼트 */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, alignItems: "stretch" }}>
        <div className="card blueprint">
          <Corners />
          <div className="card-kicker">최근 14일 · 시장 수요 지수 vs 자사 등록</div>
          <TrendChart trend={report.trend} />
          <div style={{ display: "flex", gap: 18, fontSize: 12, marginTop: 8 }}>
            <Legend color="var(--color-accent)" label="시장 수요 지수(모델)" />
            <Legend color="#7C5CFF" label="자사 등록(실측)" />
          </div>
        </div>
        <div className="card blueprint">
          <Corners />
          <div className="card-kicker">세그먼트 성장률 (모델 추정)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            {m.segments.map((s) => (
              <div key={s.name}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span>{s.name}</span>
                  <span style={{ color: "var(--color-accent)" }}>+{s.growthPct}%</span>
                </div>
                <div style={{ height: 8, background: "var(--color-surface)", borderRadius: 4, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.min(100, s.growthPct * 2.6)}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, var(--color-accent), #7C5CFF)",
                    }}
                  />
                </div>
                <div style={{ fontSize: 11, marginTop: 2 }} className="text-muted">
                  점유 {s.sharePct}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 비교표 */}
      <div>
        <h3 style={{ fontSize: 18, marginBottom: 12 }}>시장 vs 자사 비교</h3>
        <table className="table">
          <thead>
            <tr>
              <th>지표</th>
              <th>시장 (모델)</th>
              <th>자사 (실측)</th>
              <th>해석</th>
            </tr>
          </thead>
          <tbody>
            {report.comparison.map((c) => (
              <tr key={c.metric}>
                <td>{c.metric}</td>
                <td style={{ fontFamily: "var(--font-heading)" }}>{c.market}</td>
                <td style={{ fontFamily: "var(--font-heading)", color: "var(--color-accent)" }}>{c.ours}</td>
                <td style={{ fontSize: 12 }} className="text-muted">{c.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 지역 */}
      <div>
        <h3 style={{ fontSize: 18, marginBottom: 12 }}>지역별 수요 · 자사 점유</h3>
        <table className="table">
          <thead>
            <tr>
              <th>지역</th>
              <th>수요 지수</th>
              <th>성장률</th>
              <th>자사 점유(설문 실측)</th>
            </tr>
          </thead>
          <tbody>
            {m.regions.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td>{r.demandIndex}</td>
                <td style={{ color: "var(--color-accent)" }}>+{r.growthPct}%</td>
                <td>{r.ourSharePct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AI 인사이트 */}
      <div>
        <h3 style={{ fontSize: 18, marginBottom: 12 }}>AI 인사이트</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {report.insights.map((ins, i) => (
            <div key={i} className="card blueprint" style={{ borderLeft: `3px solid ${SEVERITY[ins.severity].color}` }}>
              <Corners />
              <div style={{ marginBottom: 8 }}>
                <Tag variant={ins.severity === "risk" ? "accent" : "outline"}>{SEVERITY[ins.severity].label}</Tag>
              </div>
              <div className="card-title" style={{ fontSize: 15 }}>{ins.title}</div>
              <div className="card-body" style={{ fontSize: 13 }}>{ins.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 추천 액션 */}
      <div>
        <h3 style={{ fontSize: 18, marginBottom: 12 }}>추천 솔루션 (자동 제안)</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {report.actions.map((a, i) => (
            <div key={i} className="card blueprint" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <Corners />
              <Tag variant={a.priority === "높음" ? "accent" : "neutral"}>{a.priority}</Tag>
              <div style={{ flex: 1 }}>
                <div className="card-title" style={{ fontSize: 15 }}>{a.title}</div>
                <div className="card-body" style={{ fontSize: 13 }}>{a.body}</div>
                <div style={{ fontSize: 12, marginTop: 6, color: "var(--color-accent)" }}>
                  기대 효과 · {a.expectedImpact}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p style={{ fontSize: 11, lineHeight: 1.6 }} className="text-muted">
        {report.dataNote}
      </p>
    </div>
  );
}

function Kpi({ label, value, meta, accent }: { label: string; value: string; meta?: string; accent?: boolean }) {
  return (
    <div className="card blueprint" style={{ borderColor: accent ? "var(--color-accent)" : undefined }}>
      <Corners />
      <div className="card-kicker">{label}</div>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 26 }}>{value}</div>
      {meta && <div className="card-meta">{meta}</div>}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }} className="text-muted">
      <span style={{ width: 10, height: 10, background: color, borderRadius: 2, display: "inline-block" }} />
      {label}
    </span>
  );
}

function TrendChart({ trend }: { trend: { date: string; marketDemand: number; ourRegistrations: number }[] }) {
  const W = 520;
  const H = 160;
  const pad = { l: 8, r: 8, t: 12, b: 20 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const n = trend.length;
  const maxDemand = Math.max(...trend.map((t) => t.marketDemand), 1);
  const maxReg = Math.max(...trend.map((t) => t.ourRegistrations), 1);
  const x = (i: number) => pad.l + (iw * i) / Math.max(1, n - 1);
  const yD = (v: number) => pad.t + ih - (ih * v) / maxDemand;
  const yR = (v: number) => pad.t + ih - (ih * v) / maxReg;
  const line = (fn: (t: (typeof trend)[number]) => number) =>
    trend.map((t, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${fn(t).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", marginTop: 12 }} preserveAspectRatio="none">
      <path d={line((t) => yD(t.marketDemand))} fill="none" stroke="var(--color-accent)" strokeWidth={2} />
      <path d={line((t) => yR(t.ourRegistrations))} fill="none" stroke="#7C5CFF" strokeWidth={2} />
      {trend.map((t, i) =>
        i % 3 === 0 ? (
          <text key={i} x={x(i)} y={H - 6} fontSize={9} fill="var(--color-muted, #8A90A2)" textAnchor="middle">
            {t.date}
          </text>
        ) : null
      )}
    </svg>
  );
}
