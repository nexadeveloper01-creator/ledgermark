"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Corners } from "@/components/ui/Corners";

interface Inspection {
  id: string;
  uidCode: string;
  verdict: {
    verdict: "VERIFIED" | "SEIZURE_GROUNDS" | "COUNTERFEIT_SUSPECTED";
    verdictEn: string;
    label: string;
    rule: string;
    basis: string;
    cta: string;
    hasReport: boolean;
    reportTitle: string;
    reportEn: string;
    legalNote: string;
  };
  rows: { k: string; v: string }[];
  ledgerSnapshot: string | null;
  reportNumber: string | null;
  officerName: string;
  location: string;
  createdAt: string;
}

const OFFICER = "PNP 단속관 J. Reyes";
const LOCATION = "마카티 지점 MM-014";

export default function FieldPage() {
  const [code, setCode] = useState("");
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [reportNumber, setReportNumber] = useState<string | null>(null);
  const [escalated, setEscalated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inspect = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setReportNumber(null);
    setEscalated(false);

    const res = await fetch("/api/field/inspect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uidCode: code.trim(), officerName: OFFICER, location: LOCATION }),
    });
    const body = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(body.error ?? "조회에 실패했습니다.");
      setInspection(null);
      return;
    }
    setInspection(body.inspection);
  };

  const issueReport = async () => {
    if (!inspection) return;
    setError(null);
    const res = await fetch(`/api/field/inspections/${inspection.id}/report`, { method: "POST" });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error);
      return;
    }
    setReportNumber(body.inspection.reportNumber);
  };

  const escalate = async () => {
    if (!inspection) return;
    setError(null);
    const res = await fetch(`/api/field/inspections/${inspection.id}/escalate`, { method: "POST" });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error);
      return;
    }
    setEscalated(true);
  };

  const isAlert = inspection && inspection.verdict.verdict !== "VERIFIED";

  return (
    <div style={{ minHeight: "100vh" }}>
      <div
        className="nav"
        style={{ borderBottom: "1px solid var(--color-divider)", padding: "0 32px", height: 64, gap: 18 }}
      >
        <span className="nav-brand" style={{ fontSize: 17, letterSpacing: "0.12em" }}>
          LEDGERMARK
        </span>
        <span
          style={{
            fontSize: 11,
            letterSpacing: "0.14em",
            color: "var(--color-accent-700)",
            border: "1px solid var(--color-divider)",
            padding: "2px 8px",
          }}
        >
          FIELD ENFORCEMENT
        </span>
        <span style={{ marginLeft: "auto", fontSize: 12 }} className="text-muted">
          {OFFICER} · {LOCATION}
        </span>
        <Link href="/" style={{ fontSize: 13, marginLeft: 18 }}>
          랜딩
        </Link>
      </div>

      <div
        style={{
          padding: "56px 32px 72px",
          display: "flex",
          gap: 44,
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        <div style={{ maxWidth: 360, minWidth: 260 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.16em", color: "var(--color-accent-700)" }}>
            FIELD ENFORCEMENT
          </div>
          <h2 style={{ fontSize: 32, margin: "6px 0 14px", letterSpacing: "-0.01em" }}>현장 단속 단말</h2>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: "0 0 18px" }}>
            경찰·단속기관이 현장에서 UID를 스캔하면 원장 판정과 압수 근거가 즉시 산출됩니다. 관제
            콘솔과 달리 단일 제품 판정과 조서 작성에만 집중합니다.
          </p>

          <div className="field" style={{ marginBottom: 12 }}>
            <label>UID 코드</label>
            <input
              className="input"
              placeholder="PH-2609-A-000010"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && inspect()}
            />
          </div>
          <Button variant="primary" block onClick={inspect} disabled={loading}>
            현장 조회 / SCAN
          </Button>

          <div style={{ fontSize: 11, lineHeight: 1.6, marginTop: 18 }} className="text-muted">
            조서에 첨부되는 원장 스냅샷은 앵커링된 Merkle Root를 포함하므로, 사후에 데이터가 변경되지
            않았음을 제3자가 검증할 수 있습니다.
          </div>

          {error && (
            <p style={{ fontSize: 12, marginTop: 14, color: "var(--color-accent-700)" }}>{error}</p>
          )}
        </div>

        <div
          className="blueprint"
          style={{ width: 372, flex: "none", background: "var(--color-bg)", padding: 0 }}
        >
          <Corners />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              borderBottom: "1px solid var(--color-divider)",
              fontSize: 11,
              letterSpacing: "0.08em",
            }}
          >
            <span>14:26</span>
            <span style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.16em" }}>
              LEDGERMARK FIELD
            </span>
            <span className="text-muted">PNP</span>
          </div>

          <div
            style={{
              padding: "22px 20px 26px",
              minHeight: 560,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ fontSize: 10, letterSpacing: "0.14em" }} className="text-muted">
              SCANNED UID
            </div>
            <div
              style={{
                fontFamily: "ui-monospace, Menlo, monospace",
                fontSize: 16,
                marginTop: 6,
                wordBreak: "break-all",
              }}
            >
              {inspection?.uidCode ?? "—"}
            </div>

            {inspection ? (
              <>
                <div
                  className="blueprint"
                  style={{
                    background: isAlert ? "var(--color-accent-100)" : "transparent",
                    padding: 16,
                    margin: "18px 0 20px",
                  }}
                >
                  <Corners />
                  <div style={{ fontSize: 10, letterSpacing: "0.14em", opacity: 0.7 }}>
                    {inspection.verdict.verdictEn}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: 24,
                      lineHeight: 1.15,
                      marginTop: 6,
                    }}
                  >
                    {inspection.verdict.label.split("—").pop()?.trim() ?? inspection.verdict.label}
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.55, marginTop: 8 }}>
                    {inspection.verdict.basis}
                  </div>
                </div>

                {inspection.rows.map((r) => (
                  <div
                    key={r.k}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "9px 0",
                      borderTop: "1px solid var(--color-divider)",
                      fontSize: 13,
                    }}
                  >
                    <span className="text-muted">{r.k}</span>
                    <span style={{ textAlign: "right" }}>{r.v}</span>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-muted" style={{ fontSize: 13, marginTop: 20 }}>
                UID를 조회하면 원장 판정 결과가 표시됩니다.
              </p>
            )}

            <div style={{ marginTop: "auto", paddingTop: 22, display: "flex", gap: 8 }}>
              <Button
                variant="primary"
                className="blueprint"
                style={{ flex: 1, height: 46 }}
                disabled={!inspection || (inspection.verdict.hasReport && reportNumber !== null)}
                onClick={inspection?.verdict.hasReport ? issueReport : undefined}
              >
                <Corners />
                {inspection?.verdict.cta ?? "현장 조회"}
              </Button>
              <Button
                variant="secondary"
                style={{ height: 46, padding: "0 14px" }}
                onClick={inspect}
                disabled={!code.trim()}
              >
                재스캔
              </Button>
            </div>
          </div>
        </div>

        <div className="blueprint" style={{ width: 380, flex: "none", padding: 22, background: "transparent" }}>
          <Corners />
          <div className="card-kicker">{inspection?.verdict.reportEn ?? "REPORT"}</div>
          <h3 style={{ fontSize: 21, margin: "5px 0 14px" }}>
            {inspection?.verdict.reportTitle ?? "조서"}
          </h3>

          {inspection ? (
            <>
              <ReportRow k="조서번호" v={reportNumber ?? (inspection.verdict.hasReport ? "미발행" : "작성 불필요")} />
              <ReportRow k="판정" v={inspection.verdict.label} />
              <ReportRow k="판정 규칙" v={inspection.verdict.rule === "—" ? "—" : `${inspection.verdict.rule} (플랫폼 규칙)`} />
              <ReportRow
                k="적용 법조"
                v={
                  inspection.verdict.verdict === "COUNTERFEIT_SUSPECTED"
                    ? "상표법 · 관세법 — 확인 필요"
                    : inspection.verdict.verdict === "SEIZURE_GROUNDS"
                      ? "진출국 관세법 — 확인 필요"
                      : "—"
                }
              />
              <ReportRow k="대상 UID" v={inspection.uidCode} />
              <ReportRow k="일시 · 장소" v={`${new Date(inspection.createdAt).toLocaleString("ko-KR")} · ${inspection.location}`} />
              <ReportRow k="담당관" v={inspection.officerName} />
              <ReportRow
                k="원장 스냅샷"
                v={
                  inspection.ledgerSnapshot
                    ? `${inspection.ledgerSnapshot.slice(0, 10)}…${inspection.ledgerSnapshot.slice(-4)}`
                    : "앵커링 이력 없음"
                }
              />

              <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
                {inspection.verdict.hasReport && (
                  <Button
                    variant="primary"
                    className="blueprint"
                    style={{ height: 40, padding: "0 14px" }}
                    onClick={issueReport}
                    disabled={reportNumber !== null}
                  >
                    <Corners />
                    {reportNumber ? "발행 완료" : "조서 발행"}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  style={{ height: 40, padding: "0 14px" }}
                  onClick={escalate}
                  disabled={!isAlert || escalated}
                >
                  {escalated ? "전송 완료" : "관제 콘솔 전송"}
                </Button>
              </div>

              <div style={{ fontSize: 11, lineHeight: 1.6, marginTop: 14 }} className="text-muted">
                {inspection.verdict.legalNote}
              </div>
            </>
          ) : (
            <p className="text-muted" style={{ fontSize: 13 }}>
              조회 후 판정 결과에 따라 조서가 자동 구성됩니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportRow({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "8px 0",
        borderTop: "1px solid var(--color-divider)",
        fontSize: 12,
      }}
    >
      <span className="text-muted">{k}</span>
      <span style={{ textAlign: "right", overflowWrap: "anywhere" }}>{v}</span>
    </div>
  );
}
