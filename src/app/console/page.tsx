"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Corners } from "@/components/ui/Corners";
import { Tag } from "@/components/ui/Tag";
import { SessionBar, useSession } from "@/components/SessionBar";

type Module = "dashboard" | "lookup" | "alerts" | "ledger" | "audit";

const MODULES: { key: Module; label: string }[] = [
  { key: "dashboard", label: "대시보드" },
  { key: "lookup", label: "UID 조회" },
  { key: "alerts", label: "밀수 알림" },
  { key: "ledger", label: "원장 상태" },
  { key: "audit", label: "감사 로그" },
];

interface Kpis {
  totalUids: number;
  byStatus: Record<string, number>;
  openAlerts: number;
  lastAnchor: { merkleRoot: string; txCount: number; createdAt: string } | null;
  ledgerIntegrity: { valid: boolean; length: number; reason?: string; brokenAtSequence?: number };
}

const STATUS_LABEL: Record<string, string> = {
  MINTED: "발급됨",
  EXPORTED: "수출됨",
  WHOLESALE: "총판 배분",
  RETAIL_SOLD: "소비자 판매",
  EXCHANGED: "교환됨",
  RESOLD: "중고 거래됨",
};

export default function ConsolePage() {
  const { user, loading } = useSession(["GOV_INSPECTOR", "ADMIN"]);
  const [module, setModule] = useState<Module>("dashboard");

  if (loading || !user) {
    return (
      <p className="text-muted" style={{ padding: 32 }}>
        불러오는 중...
      </p>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <div
        className="nav"
        style={{
          borderBottom: "1px solid var(--color-divider)",
          padding: "0 32px",
          height: 64,
          gap: 20,
        }}
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
          BOC · DTI CONSOLE
        </span>
        <div className="seg" style={{ marginLeft: 12 }}>
          {MODULES.map((m) => (
            <label key={m.key} className="seg-opt">
              <input
                type="radio"
                name="module"
                checked={module === m.key}
                onChange={() => setModule(m.key)}
              />
              {m.label}
            </label>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <SessionBar user={user} />
          <Link href="/" style={{ fontSize: 13 }}>
            랜딩 페이지
          </Link>
        </div>
      </div>

      <div style={{ padding: "28px 32px 40px" }}>
        {module === "dashboard" && <Dashboard canAnchor={user.role === "ADMIN"} />}
        {module === "lookup" && <UidLookup />}
        {module === "alerts" && <Alerts />}
        {module === "ledger" && <LedgerStatus canAnchor={user.role === "ADMIN"} />}
        {module === "audit" && <AuditLog />}
      </div>
    </div>
  );
}

function Dashboard({ canAnchor }: { canAnchor: boolean }) {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/console/kpis");
    setKpis(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !kpis) return <p className="text-muted">불러오는 중...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
        <KpiCard label="전체 UID" value={kpis.totalUids.toLocaleString()} />
        <KpiCard label="열려있는 밀수 알림" value={kpis.openAlerts.toLocaleString()} accent={kpis.openAlerts > 0} />
        <KpiCard
          label="원장 무결성"
          value={kpis.ledgerIntegrity.valid ? "정상" : "이상 감지"}
          accent={!kpis.ledgerIntegrity.valid}
          detail={`총 ${kpis.ledgerIntegrity.length.toLocaleString()}건 검증`}
        />
        <KpiCard
          label="최근 앵커링"
          value={kpis.lastAnchor ? new Date(kpis.lastAnchor.createdAt).toLocaleString("ko-KR") : "없음"}
          detail={kpis.lastAnchor ? `${kpis.lastAnchor.txCount}건 포함` : undefined}
        />
      </div>

      <div>
        <h3 style={{ fontSize: 18, marginBottom: 12 }}>UID 상태 분포</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {Object.entries(STATUS_LABEL).map(([status, label]) => (
            <Tag key={status} variant="accent">
              {label} · {kpis.byStatus[status] ?? 0}
            </Tag>
          ))}
        </div>
      </div>

      {canAnchor && (
        <div>
          <Button
            variant="primary"
            onClick={async () => {
              await fetch("/api/ledger/anchor", { method: "POST" });
              load();
            }}
          >
            앵커링 실행 / RUN ANCHOR CYCLE
          </Button>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: boolean;
}) {
  return (
    <div
      className="card blueprint"
      style={{ borderColor: accent ? "var(--color-accent)" : undefined }}
    >
      <Corners />
      <div className="card-kicker">{label}</div>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 28 }}>{value}</div>
      {detail && <div className="card-meta">{detail}</div>}
    </div>
  );
}

function UidLookup() {
  const [code, setCode] = useState("");
  const [uid, setUid] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setUid(null);
    const res = await fetch(`/api/uid/${encodeURIComponent(code.trim())}`);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "조회에 실패했습니다.");
      setLoading(false);
      return;
    }
    const body = await res.json();
    setUid(body.uid);
    setLoading(false);
  }, [code]);

  return (
    <div style={{ maxWidth: 900, display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="field" style={{ display: "flex", gap: 10, alignItems: "flex-end", maxWidth: 480 }}>
        <div style={{ flex: 1 }}>
          <label>UID 코드</label>
          <input
            className="input"
            placeholder="예: PH-2609-A-000001"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
        </div>
        <Button variant="primary" onClick={search} disabled={loading}>
          조회
        </Button>
      </div>

      {error && <p style={{ color: "var(--color-accent-700)" }}>{error}</p>}

      {uid && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Tag variant="accent">{STATUS_LABEL[uid.status] ?? uid.status}</Tag>
            <Tag variant={uid.voucherState === "AVAILABLE" ? "accent" : "neutral"}>
              교환권: {uid.voucherState}
            </Tag>
            <Tag variant="outline">LOT {uid.lot?.code}</Tag>
          </div>

          {uid.replacesUid && (
            <p className="text-muted" style={{ fontSize: 13 }}>
              이 UID는 {uid.replacesUid.code}의 교환 발급본입니다.
            </p>
          )}
          {uid.replacedBy && (
            <p className="text-muted" style={{ fontSize: 13 }}>
              이 UID는 {uid.replacedBy.code}(으)로 교환되어 폐기되었습니다.
            </p>
          )}

          <div>
            <h3 style={{ fontSize: 18, marginBottom: 10 }}>유통 이력 (원장 트랜잭션)</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>유형</th>
                  <th>일시</th>
                  <th>해시</th>
                </tr>
              </thead>
              <tbody>
                {uid.transactions.map((t: any) => (
                  <tr key={t.id}>
                    <td>{t.sequence}</td>
                    <td>{t.txType}</td>
                    <td>{new Date(t.createdAt).toLocaleString("ko-KR")}</td>
                    <td style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11 }}>
                      {t.hash.slice(0, 16)}…
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Alerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [uidCode, setUidCode] = useState("");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/console/alerts");
    const body = await res.json();
    setAlerts(body.alerts ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 900 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <label>UID 코드</label>
          <input className="input" value={uidCode} onChange={(e) => setUidCode(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 2, minWidth: 260 }}>
          <label>사유</label>
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <Button
          variant="primary"
          onClick={async () => {
            if (!uidCode.trim() || !reason.trim()) return;
            const res = await fetch("/api/console/alerts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ uidCode, reason }),
            });
            if (res.ok) {
              setUidCode("");
              setReason("");
              load();
            }
          }}
        >
          알림 등록
        </Button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>UID</th>
            <th>사유</th>
            <th>상태</th>
            <th>감지 시각</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((a) => (
            <tr key={a.id}>
              <td>
                {a.uidCode}
                {!a.uidId && (
                  <span style={{ marginLeft: 6, fontSize: 10 }} className="text-muted">
                    원장 미존재
                  </span>
                )}
              </td>
              <td>{a.reason}</td>
              <td>
                <Tag variant={a.status === "OPEN" ? "accent" : "neutral"}>{a.status}</Tag>
              </td>
              <td>{new Date(a.detectedAt).toLocaleString("ko-KR")}</td>
              <td>
                {a.status === "OPEN" && (
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      await fetch(`/api/console/alerts/${a.id}/resolve`, { method: "POST" });
                      load();
                    }}
                  >
                    해결 처리
                  </Button>
                )}
              </td>
            </tr>
          ))}
          {alerts.length === 0 && (
            <tr>
              <td colSpan={5} className="text-muted">
                등록된 알림이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const ANCHOR_STATUS_LABEL: Record<string, string> = {
  PENDING: "게시 대기",
  PUBLISHED: "게시 완료",
  FAILED: "게시 실패",
};

const SCHEDULE_REASON: Record<string, string> = {
  NO_PENDING: "앵커링할 신규 트랜잭션 없음",
  BATCH_REACHED: "건수 임계치 도달 — 다음 실행에서 앵커링",
  MAX_DELAY_EXCEEDED: "최대 지연 초과 — 다음 실행에서 앵커링",
  WAITING: "임계치 대기 중",
};

const ANCHOR_MODE_NOTE: Record<string, string> = {
  simulated: "시뮬레이션 모드 — 앵커가 퍼블릭 체인에 실제로 게시되지 않습니다. 데모용입니다.",
  chain: "체인 모드 — 앵커가 퍼블릭 체인에 실제로 게시됩니다.",
  disabled: "앵커 게시가 비활성화되어 있습니다. 로컬 Merkle 루트만 계산합니다.",
};

function LedgerStatus({ canAnchor }: { canAnchor: boolean }) {
  const [verify, setVerify] = useState<any>(null);
  const [anchors, setAnchors] = useState<any[]>([]);
  const [mode, setMode] = useState<string>("simulated");
  const [schedule, setSchedule] = useState<any>(null);
  const [checked, setChecked] = useState<Record<string, any>>({});

  const load = useCallback(async () => {
    const [v, a] = await Promise.all([
      fetch("/api/ledger/verify").then((r) => r.json()),
      fetch("/api/ledger/anchor").then((r) => r.json()),
    ]);
    setVerify(v);
    setAnchors(a.anchors ?? []);
    setMode(a.mode ?? "simulated");
    setSchedule(a.schedule ?? null);
  }, []);

  const verifyAnchor = async (id: string) => {
    const res = await fetch(`/api/ledger/anchor/${id}/verify`);
    const body = await res.json();
    setChecked((prev) => ({ ...prev, [id]: res.ok ? body.verification : { message: body.error } }));
  };

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 900 }}>
      {verify && (
        <div className="card blueprint" style={{ borderColor: verify.valid ? undefined : "var(--color-accent)" }}>
          <Corners />
          <div className="card-kicker">해시체인 무결성</div>
          <div className="card-title">{verify.valid ? "조작 흔적 없음" : "무결성 이상 감지"}</div>
          <div className="card-body">
            총 {verify.length.toLocaleString()}건의 원장 트랜잭션을 재계산하여 검증했습니다.
            {!verify.valid && ` (시퀀스 #${verify.brokenAtSequence}에서 불일치: ${verify.reason})`}
          </div>
        </div>
      )}

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <h3 style={{ fontSize: 18, margin: 0 }}>퍼블릭 앵커링 이력</h3>
          {canAnchor && (
            <Button
              variant="secondary"
              onClick={async () => {
                await fetch("/api/ledger/anchor", { method: "POST" });
                load();
              }}
            >
              앵커링 실행
            </Button>
          )}
        </div>
        <p style={{ fontSize: 12, marginBottom: 12 }} className="text-muted">
          {ANCHOR_MODE_NOTE[mode] ?? mode}
        </p>

        {schedule && (
          <div className="blueprint" style={{ padding: 16, background: "transparent", marginBottom: 18 }}>
            <Corners />
            <div className="card-kicker">앵커링 스케줄</div>
            <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginTop: 8, fontSize: 13 }}>
              <span>
                <span className="text-muted">자동 실행 </span>
                <Tag variant={schedule.automated ? "accent" : "neutral"}>
                  {schedule.automated ? "설정됨" : "미설정"}
                </Tag>
              </span>
              <span>
                <span className="text-muted">미앵커 </span>
                {schedule.pendingCount.toLocaleString()}건
              </span>
              <span>
                <span className="text-muted">정책 </span>
                {schedule.minBatch}건 이상 또는 {schedule.maxDelayMinutes}분 경과 시
              </span>
              <span>
                <span className="text-muted">현재 판정 </span>
                {SCHEDULE_REASON[schedule.reason] ?? schedule.reason}
              </span>
            </div>
            {!schedule.automated && (
              <div style={{ fontSize: 11, marginTop: 10 }} className="text-muted">
                ANCHOR_CRON_SECRET을 설정하고 외부 스케줄러가
                <code style={{ margin: "0 4px" }}>POST /api/ledger/anchor/cron</code>
                을 호출하도록 하거나, <code>npm run anchor:worker</code>를 실행하면 자동화됩니다.
              </div>
            )}
          </div>
        )}

        <table className="table">
          <thead>
            <tr>
              <th>구간</th>
              <th>건수</th>
              <th>Merkle Root</th>
              <th>게시 상태</th>
              <th>트랜잭션</th>
              <th>검증</th>
            </tr>
          </thead>
          <tbody>
            {anchors.map((a) => (
              <tr key={a.id}>
                <td style={{ whiteSpace: "nowrap" }}>
                  #{a.fromSequence} – #{a.toSequence}
                </td>
                <td>{a.txCount}</td>
                <td style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11 }}>
                  {a.merkleRoot.slice(0, 16)}…
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <Tag variant={a.status === "PUBLISHED" ? "accent" : "neutral"}>
                    {ANCHOR_STATUS_LABEL[a.status] ?? a.status}
                  </Tag>
                  {a.chainId === 0 && (
                    <span className="text-muted" style={{ marginLeft: 6, fontSize: 10 }}>
                      시뮬레이션
                    </span>
                  )}
                </td>
                <td style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11 }}>
                  {a.publicAnchorRef ? (
                    a.explorerUrl ? (
                      <a href={a.explorerUrl} target="_blank" rel="noreferrer">
                        {a.publicAnchorRef.slice(0, 14)}…
                      </a>
                    ) : (
                      `${a.publicAnchorRef.slice(0, 14)}…`
                    )
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                  {a.lastError && (
                    <div style={{ fontSize: 10, color: "var(--color-accent-700)" }}>{a.lastError}</div>
                  )}
                </td>
                <td style={{ fontSize: 11 }}>
                  {a.publicAnchorRef && (
                    <Button
                      variant="ghost"
                      style={{ fontSize: 11 }}
                      onClick={() => verifyAnchor(a.id)}
                    >
                      검증
                    </Button>
                  )}
                  {checked[a.id] && (
                    <div style={{ fontSize: 10, marginTop: 4 }} className="text-muted">
                      {checked[a.id].matches ? "✓ " : ""}
                      {checked[a.id].message}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {anchors.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted">
                  아직 앵커링 이력이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const AUDIT_LABEL: Record<string, string> = {
  LOGIN_SUCCESS: "로그인",
  LOGIN_FAILED: "로그인 실패",
  LOGIN_BLOCKED: "로그인 차단",
  LOGOUT: "로그아웃",
  LOT_MINTED: "LOT 발급",
  UID_TRANSFERRED: "소유권 이전",
  REQUEST_CREATED: "이전 요청",
  REQUEST_COMMITTED: "이전 커밋",
  REQUEST_REJECTED: "요청 반려",
  AGE_VERIFICATION: "연령인증",
  CONSUMER_LOOKUP: "소비자 조회",
  FIELD_INSPECTION: "현장 판정",
  FIELD_REPORT_ISSUED: "조서 발행",
  ALERT_CREATED: "알림 등록",
  ALERT_RESOLVED: "알림 해결",
  ANCHOR_RUN: "앵커링 실행",
};

function AuditLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [action, setAction] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/console/audit${action ? `?action=${action}` : ""}`);
    const body = await res.json();
    setLogs(body.logs ?? []);
  }, [action]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div className="field" style={{ minWidth: 200 }}>
          <label>동작 필터</label>
          <select className="input" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">전체</option>
            {Object.entries(AUDIT_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <Button variant="secondary" onClick={load}>
          새로고침
        </Button>
        <span style={{ fontSize: 12 }} className="text-muted">
          감사 로그는 열람 전용이며 수정·삭제할 수 없습니다.
        </span>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>시각</th>
            <th>동작</th>
            <th>수행자</th>
            <th>대상</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>
                {new Date(l.createdAt).toLocaleString("ko-KR")}
              </td>
              <td style={{ fontSize: 12 }}>
                <Tag variant={l.action.startsWith("LOGIN_F") || l.action === "LOGIN_BLOCKED" ? "accent" : "neutral"}>
                  {AUDIT_LABEL[l.action] ?? l.action}
                </Tag>
              </td>
              <td style={{ fontSize: 12 }}>
                {l.actorUser?.displayName ?? l.actorEmail ?? "—"}
                {l.actorRole && (
                  <span className="text-muted" style={{ marginLeft: 6, fontSize: 10 }}>
                    {l.actorRole}
                  </span>
                )}
              </td>
              <td style={{ fontSize: 11, fontFamily: "ui-monospace, Menlo, monospace" }}>
                {l.detail?.uidCode ?? l.detail?.code ?? l.targetType ?? "—"}
              </td>
              <td style={{ fontSize: 11 }} className="text-muted">
                {l.ip ?? "—"}
              </td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan={5} className="text-muted">
                기록이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
