"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Corners } from "@/components/ui/Corners";
import { Tag } from "@/components/ui/Tag";
import { SessionBar, useSession } from "@/components/SessionBar";
import { Accounts } from "@/components/console/Accounts";
import { Production } from "@/components/console/Production";
import { MarketIntel } from "@/components/console/MarketIntel";
import { useT, LangToggle, type Dict } from "@/lib/i18n/web";

type Module =
  | "dashboard"
  | "lookup"
  | "alerts"
  | "ledger"
  | "audit"
  | "accounts"
  | "production"
  | "market";

const MODULE_ORDER: Module[] = ["dashboard", "lookup", "alerts", "ledger", "audit"];
const ADMIN_ORDER: Module[] = ["market", "production", "accounts"];

interface Kpis {
  totalUids: number;
  byStatus: Record<string, number>;
  openAlerts: number;
  lastAnchor: { merkleRoot: string; txCount: number; createdAt: string } | null;
  ledgerIntegrity: { valid: boolean; length: number; reason?: string; brokenAtSequence?: number };
}

const C: Dict = {
  "console.badge": { ko: "관세청 · DTI 콘솔", en: "BOC · DTI Console" },
  "console.landing": { ko: "랜딩 페이지", en: "Landing" },
  "common.loading": { ko: "불러오는 중...", en: "Loading..." },

  "mod.dashboard": { ko: "대시보드", en: "Dashboard" },
  "mod.lookup": { ko: "UID 조회", en: "UID lookup" },
  "mod.alerts": { ko: "밀수 알림", en: "Smuggling alerts" },
  "mod.ledger": { ko: "원장 상태", en: "Ledger" },
  "mod.audit": { ko: "감사 로그", en: "Audit log" },
  "mod.market": { ko: "시장분석 (AI)", en: "Market AI" },
  "mod.production": { ko: "생산·라벨", en: "Production" },
  "mod.accounts": { ko: "계정 관리", en: "Accounts" },

  "st.MINTED": { ko: "발급됨", en: "Minted" },
  "st.EXPORTED": { ko: "수출됨", en: "Exported" },
  "st.WHOLESALE": { ko: "총판 배분", en: "Wholesale" },
  "st.RETAIL_SOLD": { ko: "소비자 판매", en: "Retail sold" },
  "st.EXCHANGED": { ko: "교환됨", en: "Exchanged" },
  "st.RESOLD": { ko: "중고 거래됨", en: "Resold" },

  "dash.totalUids": { ko: "전체 UID", en: "Total UIDs" },
  "dash.openAlerts": { ko: "열려있는 밀수 알림", en: "Open smuggling alerts" },
  "dash.integrity": { ko: "원장 무결성", en: "Ledger integrity" },
  "dash.integrityOk": { ko: "정상", en: "Intact" },
  "dash.integrityBad": { ko: "이상 감지", en: "Anomaly" },
  "dash.integrityDetail": { ko: "총 {n}건 검증", en: "{n} entries verified" },
  "dash.lastAnchor": { ko: "최근 앵커링", en: "Last anchor" },
  "dash.none": { ko: "없음", en: "None" },
  "dash.anchorIncluded": { ko: "{n}건 포함", en: "{n} tx included" },
  "dash.statusDist": { ko: "UID 상태 분포", en: "UID status distribution" },
  "dash.runAnchor": { ko: "앵커링 실행 / RUN ANCHOR CYCLE", en: "Run anchor cycle" },

  "lk.uidCode": { ko: "UID 코드", en: "UID code" },
  "lk.search": { ko: "조회", en: "Look up" },
  "lk.fail": { ko: "조회에 실패했습니다.", en: "Lookup failed." },
  "lk.voucher": { ko: "교환권", en: "Voucher" },
  "lk.replaces": { ko: "이 UID는 {code}의 교환 발급본입니다.", en: "This UID was issued to replace {code}." },
  "lk.replacedBy": { ko: "이 UID는 {code}(으)로 교환되어 폐기되었습니다.", en: "This UID was retired and replaced by {code}." },
  "lk.history": { ko: "유통 이력 (원장 트랜잭션)", en: "Distribution history (ledger)" },
  "lk.th.type": { ko: "유형", en: "Type" },
  "lk.th.time": { ko: "일시", en: "Time" },
  "lk.th.hash": { ko: "해시", en: "Hash" },

  "al.reason": { ko: "사유", en: "Reason" },
  "al.register": { ko: "알림 등록", en: "Add alert" },
  "al.th.status": { ko: "상태", en: "Status" },
  "al.th.time": { ko: "감지 시각", en: "Detected" },
  "al.notLedger": { ko: "원장 미존재", en: "Not on ledger" },
  "al.resolve": { ko: "해결 처리", en: "Resolve" },
  "al.none": { ko: "등록된 알림이 없습니다.", en: "No alerts." },

  "lg.integrityTitle": { ko: "해시체인 무결성", en: "Hash-chain integrity" },
  "lg.tamperNone": { ko: "조작 흔적 없음", en: "No tampering detected" },
  "lg.tamperFound": { ko: "무결성 이상 감지", en: "Integrity anomaly detected" },
  "lg.body": { ko: "총 {n}건의 원장 트랜잭션을 재계산하여 검증했습니다.", en: "Re-computed and verified {n} ledger transactions." },
  "lg.broken": { ko: " (시퀀스 #{seq}에서 불일치: {reason})", en: " (mismatch at sequence #{seq}: {reason})" },
  "lg.anchorHistory": { ko: "퍼블릭 앵커링 이력", en: "Public anchoring history" },
  "lg.runAnchor": { ko: "앵커링 실행", en: "Run anchor" },
  "lg.mode.simulated": { ko: "시뮬레이션 모드 — 앵커가 퍼블릭 체인에 실제로 게시되지 않습니다. 데모용입니다.", en: "Simulated mode — anchors are not posted to a public chain. For demo." },
  "lg.mode.chain": { ko: "체인 모드 — 앵커가 퍼블릭 체인에 실제로 게시됩니다.", en: "Chain mode — anchors are posted to a public chain." },
  "lg.mode.disabled": { ko: "앵커 게시가 비활성화되어 있습니다. 로컬 Merkle 루트만 계산합니다.", en: "Anchor posting disabled. Local Merkle root only." },
  "lg.scheduleTitle": { ko: "앵커링 스케줄", en: "Anchor schedule" },
  "lg.autoRun": { ko: "자동 실행", en: "Automated" },
  "lg.set": { ko: "설정됨", en: "On" },
  "lg.unset": { ko: "미설정", en: "Off" },
  "lg.unanchored": { ko: "미앵커", en: "Unanchored" },
  "lg.count": { ko: "건", en: "" },
  "lg.policy": { ko: "정책", en: "Policy" },
  "lg.policyVal": { ko: "{min}건 이상 또는 {delay}분 경과 시", en: "≥ {min} tx or after {delay} min" },
  "lg.judgment": { ko: "현재 판정", en: "Current" },
  "lg.reason.NO_PENDING": { ko: "앵커링할 신규 트랜잭션 없음", en: "No new tx to anchor" },
  "lg.reason.BATCH_REACHED": { ko: "건수 임계치 도달 — 다음 실행에서 앵커링", en: "Batch threshold reached — will anchor next run" },
  "lg.reason.MAX_DELAY_EXCEEDED": { ko: "최대 지연 초과 — 다음 실행에서 앵커링", en: "Max delay exceeded — will anchor next run" },
  "lg.reason.WAITING": { ko: "임계치 대기 중", en: "Waiting for threshold" },
  "lg.th.range": { ko: "구간", en: "Range" },
  "lg.th.count": { ko: "건수", en: "Count" },
  "lg.th.pubStatus": { ko: "게시 상태", en: "Publish status" },
  "lg.th.tx": { ko: "트랜잭션", en: "Transaction" },
  "lg.th.verify": { ko: "검증", en: "Verify" },
  "lg.astatus.PENDING": { ko: "게시 대기", en: "Pending" },
  "lg.astatus.PUBLISHED": { ko: "게시 완료", en: "Published" },
  "lg.astatus.FAILED": { ko: "게시 실패", en: "Failed" },
  "lg.simulation": { ko: "시뮬레이션", en: "Simulated" },
  "lg.verify": { ko: "검증", en: "Verify" },
  "lg.noAnchors": { ko: "아직 앵커링 이력이 없습니다.", en: "No anchoring history yet." },

  "au.filter": { ko: "동작 필터", en: "Action filter" },
  "au.all": { ko: "전체", en: "All" },
  "au.refresh": { ko: "새로고침", en: "Refresh" },
  "au.readonly": { ko: "감사 로그는 열람 전용이며 수정·삭제할 수 없습니다.", en: "The audit log is read-only and cannot be edited or deleted." },
  "au.th.time": { ko: "시각", en: "Time" },
  "au.th.action": { ko: "동작", en: "Action" },
  "au.th.actor": { ko: "수행자", en: "Actor" },
  "au.th.target": { ko: "대상", en: "Target" },
  "au.none": { ko: "기록이 없습니다.", en: "No records." },
  "au.LOGIN_SUCCESS": { ko: "로그인", en: "Login" },
  "au.LOGIN_FAILED": { ko: "로그인 실패", en: "Login failed" },
  "au.LOGIN_BLOCKED": { ko: "로그인 차단", en: "Login blocked" },
  "au.LOGOUT": { ko: "로그아웃", en: "Logout" },
  "au.LOT_MINTED": { ko: "LOT 발급", en: "Lot minted" },
  "au.UID_TRANSFERRED": { ko: "소유권 이전", en: "Ownership transfer" },
  "au.REQUEST_CREATED": { ko: "이전 요청", en: "Transfer request" },
  "au.REQUEST_COMMITTED": { ko: "이전 커밋", en: "Transfer committed" },
  "au.REQUEST_REJECTED": { ko: "요청 반려", en: "Request rejected" },
  "au.AGE_VERIFICATION": { ko: "연령인증", en: "Age verification" },
  "au.CONSUMER_LOOKUP": { ko: "소비자 조회", en: "Consumer lookup" },
  "au.FIELD_INSPECTION": { ko: "현장 판정", en: "Field inspection" },
  "au.FIELD_REPORT_ISSUED": { ko: "조서 발행", en: "Report issued" },
  "au.ALERT_CREATED": { ko: "알림 등록", en: "Alert created" },
  "au.ALERT_RESOLVED": { ko: "알림 해결", en: "Alert resolved" },
  "au.ANCHOR_RUN": { ko: "앵커링 실행", en: "Anchor run" },
};

export default function ConsolePage() {
  const { user, loading } = useSession(["GOV_INSPECTOR", "ADMIN"]);
  const [module, setModule] = useState<Module>("dashboard");
  const t = useT(C);

  if (loading || !user) {
    return (
      <p className="text-muted" style={{ padding: 32 }}>
        {t("common.loading")}
      </p>
    );
  }

  const modules = [...MODULE_ORDER, ...(user.role === "ADMIN" ? ADMIN_ORDER : [])];

  return (
    <div style={{ minHeight: "100vh" }}>
      <div
        className="nav"
        style={{ borderBottom: "1px solid var(--color-divider)", padding: "0 32px", height: 64, gap: 20 }}
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
          {t("console.badge")}
        </span>
        <div className="seg" style={{ marginLeft: 12 }}>
          {modules.map((m) => (
            <label key={m} className="seg-opt">
              <input type="radio" name="module" checked={module === m} onChange={() => setModule(m)} />
              {t(`mod.${m}`)}
            </label>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <LangToggle />
          <SessionBar user={user} />
          <Link href="/" style={{ fontSize: 13 }}>
            {t("console.landing")}
          </Link>
        </div>
      </div>

      <div style={{ padding: "28px 32px 40px" }}>
        {module === "dashboard" && <Dashboard canAnchor={user.role === "ADMIN"} />}
        {module === "lookup" && <UidLookup />}
        {module === "alerts" && <Alerts />}
        {module === "ledger" && <LedgerStatus canAnchor={user.role === "ADMIN"} />}
        {module === "audit" && <AuditLog />}
        {module === "accounts" && user.role === "ADMIN" && <Accounts currentUserId={user.id} />}
        {module === "production" && <Production canMint={user.role === "ADMIN"} />}
        {module === "market" && user.role === "ADMIN" && <MarketIntel />}
      </div>
    </div>
  );
}

function Dashboard({ canAnchor }: { canAnchor: boolean }) {
  const t = useT(C);
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

  if (loading || !kpis) return <p className="text-muted">{t("common.loading")}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
        <KpiCard label={t("dash.totalUids")} value={kpis.totalUids.toLocaleString()} />
        <KpiCard label={t("dash.openAlerts")} value={kpis.openAlerts.toLocaleString()} accent={kpis.openAlerts > 0} />
        <KpiCard
          label={t("dash.integrity")}
          value={kpis.ledgerIntegrity.valid ? t("dash.integrityOk") : t("dash.integrityBad")}
          accent={!kpis.ledgerIntegrity.valid}
          detail={t("dash.integrityDetail", { n: kpis.ledgerIntegrity.length.toLocaleString() })}
        />
        <KpiCard
          label={t("dash.lastAnchor")}
          value={kpis.lastAnchor ? new Date(kpis.lastAnchor.createdAt).toLocaleString() : t("dash.none")}
          detail={kpis.lastAnchor ? t("dash.anchorIncluded", { n: String(kpis.lastAnchor.txCount) }) : undefined}
        />
      </div>

      <div>
        <h3 style={{ fontSize: 18, marginBottom: 12 }}>{t("dash.statusDist")}</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {["MINTED", "EXPORTED", "WHOLESALE", "RETAIL_SOLD", "EXCHANGED", "RESOLD"].map((status) => (
            <Tag key={status} variant="accent">
              {t(`st.${status}`)} · {kpis.byStatus[status] ?? 0}
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
            {t("dash.runAnchor")}
          </Button>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, detail, accent }: { label: string; value: string; detail?: string; accent?: boolean }) {
  return (
    <div className="card blueprint" style={{ borderColor: accent ? "var(--color-accent)" : undefined }}>
      <Corners />
      <div className="card-kicker">{label}</div>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 28 }}>{value}</div>
      {detail && <div className="card-meta">{detail}</div>}
    </div>
  );
}

function UidLookup() {
  const t = useT(C);
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
      setError(body.error ?? t("lk.fail"));
      setLoading(false);
      return;
    }
    const body = await res.json();
    setUid(body.uid);
    setLoading(false);
  }, [code, t]);

  return (
    <div style={{ maxWidth: 900, display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="field" style={{ display: "flex", gap: 10, alignItems: "flex-end", maxWidth: 480 }}>
        <div style={{ flex: 1 }}>
          <label>{t("lk.uidCode")}</label>
          <input
            className="input"
            placeholder="PH-2609-A-000001"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
        </div>
        <Button variant="primary" onClick={search} disabled={loading}>
          {t("lk.search")}
        </Button>
      </div>

      {error && <p style={{ color: "var(--color-accent-700)" }}>{error}</p>}

      {uid && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Tag variant="accent">{t(`st.${uid.status}`)}</Tag>
            <Tag variant={uid.voucherState === "AVAILABLE" ? "accent" : "neutral"}>
              {t("lk.voucher")}: {uid.voucherState}
            </Tag>
            <Tag variant="outline">LOT {uid.lot?.code}</Tag>
          </div>

          {uid.replacesUid && (
            <p className="text-muted" style={{ fontSize: 13 }}>
              {t("lk.replaces", { code: uid.replacesUid.code })}
            </p>
          )}
          {uid.replacedBy && (
            <p className="text-muted" style={{ fontSize: 13 }}>
              {t("lk.replacedBy", { code: uid.replacedBy.code })}
            </p>
          )}

          <div>
            <h3 style={{ fontSize: 18, marginBottom: 10 }}>{t("lk.history")}</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t("lk.th.type")}</th>
                  <th>{t("lk.th.time")}</th>
                  <th>{t("lk.th.hash")}</th>
                </tr>
              </thead>
              <tbody>
                {uid.transactions.map((tx: any) => (
                  <tr key={tx.id}>
                    <td>{tx.sequence}</td>
                    <td>{tx.txType}</td>
                    <td>{new Date(tx.createdAt).toLocaleString()}</td>
                    <td style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11 }}>
                      {tx.hash.slice(0, 16)}…
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
  const t = useT(C);
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
          <label>{t("lk.uidCode")}</label>
          <input className="input" value={uidCode} onChange={(e) => setUidCode(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 2, minWidth: 260 }}>
          <label>{t("al.reason")}</label>
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
          {t("al.register")}
        </Button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>UID</th>
            <th>{t("al.reason")}</th>
            <th>{t("al.th.status")}</th>
            <th>{t("al.th.time")}</th>
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
                    {t("al.notLedger")}
                  </span>
                )}
              </td>
              <td>{a.reason}</td>
              <td>
                <Tag variant={a.status === "OPEN" ? "accent" : "neutral"}>{a.status}</Tag>
              </td>
              <td>{new Date(a.detectedAt).toLocaleString()}</td>
              <td>
                {a.status === "OPEN" && (
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      await fetch(`/api/console/alerts/${a.id}/resolve`, { method: "POST" });
                      load();
                    }}
                  >
                    {t("al.resolve")}
                  </Button>
                )}
              </td>
            </tr>
          ))}
          {alerts.length === 0 && (
            <tr>
              <td colSpan={5} className="text-muted">
                {t("al.none")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function LedgerStatus({ canAnchor }: { canAnchor: boolean }) {
  const t = useT(C);
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
          <div className="card-kicker">{t("lg.integrityTitle")}</div>
          <div className="card-title">{verify.valid ? t("lg.tamperNone") : t("lg.tamperFound")}</div>
          <div className="card-body">
            {t("lg.body", { n: verify.length.toLocaleString() })}
            {!verify.valid && t("lg.broken", { seq: String(verify.brokenAtSequence), reason: String(verify.reason) })}
          </div>
        </div>
      )}

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <h3 style={{ fontSize: 18, margin: 0 }}>{t("lg.anchorHistory")}</h3>
          {canAnchor && (
            <Button
              variant="secondary"
              onClick={async () => {
                await fetch("/api/ledger/anchor", { method: "POST" });
                load();
              }}
            >
              {t("lg.runAnchor")}
            </Button>
          )}
        </div>
        <p style={{ fontSize: 12, marginBottom: 12 }} className="text-muted">
          {t(`lg.mode.${mode}`)}
        </p>

        {schedule && (
          <div className="blueprint" style={{ padding: 16, background: "transparent", marginBottom: 18 }}>
            <Corners />
            <div className="card-kicker">{t("lg.scheduleTitle")}</div>
            <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginTop: 8, fontSize: 13 }}>
              <span>
                <span className="text-muted">{t("lg.autoRun")} </span>
                <Tag variant={schedule.automated ? "accent" : "neutral"}>
                  {schedule.automated ? t("lg.set") : t("lg.unset")}
                </Tag>
              </span>
              <span>
                <span className="text-muted">{t("lg.unanchored")} </span>
                {schedule.pendingCount.toLocaleString()}
                {t("lg.count")}
              </span>
              <span>
                <span className="text-muted">{t("lg.policy")} </span>
                {t("lg.policyVal", { min: String(schedule.minBatch), delay: String(schedule.maxDelayMinutes) })}
              </span>
              <span>
                <span className="text-muted">{t("lg.judgment")} </span>
                {t(`lg.reason.${schedule.reason}`)}
              </span>
            </div>
          </div>
        )}

        <table className="table">
          <thead>
            <tr>
              <th>{t("lg.th.range")}</th>
              <th>{t("lg.th.count")}</th>
              <th>Merkle Root</th>
              <th>{t("lg.th.pubStatus")}</th>
              <th>{t("lg.th.tx")}</th>
              <th>{t("lg.th.verify")}</th>
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
                  <Tag variant={a.status === "PUBLISHED" ? "accent" : "neutral"}>{t(`lg.astatus.${a.status}`)}</Tag>
                  {a.chainId === 0 && (
                    <span className="text-muted" style={{ marginLeft: 6, fontSize: 10 }}>
                      {t("lg.simulation")}
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
                  {a.lastError && <div style={{ fontSize: 10, color: "var(--color-accent-700)" }}>{a.lastError}</div>}
                </td>
                <td style={{ fontSize: 11 }}>
                  {a.publicAnchorRef && (
                    <Button variant="ghost" style={{ fontSize: 11 }} onClick={() => verifyAnchor(a.id)}>
                      {t("lg.verify")}
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
                  {t("lg.noAnchors")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const AUDIT_ACTIONS = [
  "LOGIN_SUCCESS", "LOGIN_FAILED", "LOGIN_BLOCKED", "LOGOUT", "LOT_MINTED", "UID_TRANSFERRED",
  "REQUEST_CREATED", "REQUEST_COMMITTED", "REQUEST_REJECTED", "AGE_VERIFICATION", "CONSUMER_LOOKUP",
  "FIELD_INSPECTION", "FIELD_REPORT_ISSUED", "ALERT_CREATED", "ALERT_RESOLVED", "ANCHOR_RUN",
];

function AuditLog() {
  const t = useT(C);
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
          <label>{t("au.filter")}</label>
          <select className="input" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">{t("au.all")}</option>
            {AUDIT_ACTIONS.map((key) => (
              <option key={key} value={key}>
                {t(`au.${key}`)}
              </option>
            ))}
          </select>
        </div>
        <Button variant="secondary" onClick={load}>
          {t("au.refresh")}
        </Button>
        <span style={{ fontSize: 12 }} className="text-muted">
          {t("au.readonly")}
        </span>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>{t("au.th.time")}</th>
            <th>{t("au.th.action")}</th>
            <th>{t("au.th.actor")}</th>
            <th>{t("au.th.target")}</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{new Date(l.createdAt).toLocaleString()}</td>
              <td style={{ fontSize: 12 }}>
                <Tag variant={l.action.startsWith("LOGIN_F") || l.action === "LOGIN_BLOCKED" ? "accent" : "neutral"}>
                  {AUDIT_ACTIONS.includes(l.action) ? t(`au.${l.action}`) : l.action}
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
                {t("au.none")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
