"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Corners } from "@/components/ui/Corners";
import { PhoneFigure, PhoneFrame, PhoneRow, PhoneWarn } from "@/components/PhoneFrame";
import { SessionBar, useSession } from "@/components/SessionBar";

type Step = "scan" | "verify" | "status" | "my";

// 소비자 화면에서는 UID를 앞 2자리 + XXXX + 뒤 2자리로만 노출한다(전체 값 비공개).
// API 전송·조회에는 항상 원본 코드를 쓰고, 화면 표시에만 이 마스킹을 적용한다.
function maskUid(code?: string | null): string {
  if (!code) return "";
  if (code.length <= 4) return code;
  return `${code.slice(0, 2)}XXXX${code.slice(-2)}`;
}

// 교환권 유효기간(3개월) 표기 — "~2026-12-09까지" 형태.
function voucherExpiryText(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return ` · ${ymd}까지`;
}

const STEPS: { key: Step; num: string; label: string }[] = [
  { key: "scan", num: "01", label: "UID 스캔" },
  { key: "verify", num: "02", label: "연령인증" },
  { key: "status", num: "03", label: "정품 등록 상태" },
  { key: "my", num: "04", label: "내 제품 · 교환 · 중고거래" },
];

export default function ConsumerAppPage() {
  const { user, loading } = useSession(["CONSUMER"]);
  const [step, setStep] = useState<Step>("scan");
  const [scanned, setScanned] = useState<any>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const consumerId = user?.consumerId ?? "";

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
          CONSUMER APP
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <SessionBar user={user} />
          <Link href="/" style={{ fontSize: 13 }}>
            랜딩
          </Link>
        </div>
      </div>

      <div
        style={{
          padding: "56px 32px 72px",
          display: "flex",
          gap: 72,
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        <div style={{ maxWidth: 380, minWidth: 260 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.16em", color: "var(--color-accent-700)" }}>
            CONSUMER APP
          </div>
          <h2 style={{ fontSize: 32, margin: "6px 0 14px", letterSpacing: "-0.01em" }}>
            정품 등록 &amp; 교환권
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.65, margin: "0 0 20px" }}>
            매장 전용 단말기 없이 앱만으로 UID 확인, 연령인증, 교환권 발급이 끝납니다. 원장에는
            신분정보 원본이 아니라 검증 결과 크리덴셜만 남습니다.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {STEPS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setStep(s.key)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  font: "inherit",
                  border: 0,
                  borderBottom: "1px solid var(--color-divider)",
                  borderLeft: `3px solid ${step === s.key ? "var(--color-accent)" : "transparent"}`,
                  background: step === s.key ? "var(--color-accent-100)" : "transparent",
                  padding: "11px 12px",
                  color: "var(--color-text)",
                  display: "flex",
                  gap: 10,
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, opacity: 0.6 }}>
                  {s.num}
                </span>
                <span style={{ fontSize: 13 }}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {!user.emailVerified && <VerifyBanner />}
        <PhoneFrame>
          {step === "scan" && (
            <ScanStep
              scanned={scanned}
              onScanned={setScanned}
              onNext={() => setStep("verify")}
            />
          )}
          {step === "verify" && (
            <VerifyStep
              consumerId={consumerId}
              scanned={scanned}
              verified={verified}
              onVerified={setVerified}
              onRequested={(id) => {
                setRequestId(id);
                setStep("status");
              }}
            />
          )}
          {step === "status" && <StatusStep consumerId={consumerId} requestId={requestId} />}
          {step === "my" && <MyProductsStep consumerId={consumerId} />}
        </PhoneFrame>
        </div>
      </div>
    </div>
  );
}

function StepHeader({ en, ko, desc }: { en: string; ko: string; desc: string }) {
  return (
    <>
      <div style={{ fontSize: 10, letterSpacing: "0.16em", color: "var(--color-accent-700)" }}>{en}</div>
      <h3 style={{ fontSize: 24, margin: "6px 0 8px" }}>{ko}</h3>
      <p style={{ fontSize: 13, lineHeight: 1.6, margin: "0 0 20px" }} className="text-muted">
        {desc}
      </p>
    </>
  );
}

function ScanStep({
  scanned,
  onScanned,
  onNext,
}: {
  scanned: any;
  onScanned: (uid: any) => void;
  onNext: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const lookup = async () => {
    setError(null);
    const res = await fetch(`/api/uid/${encodeURIComponent(code.trim())}`);
    if (!res.ok) {
      onScanned(null);
      setError("원장에 존재하지 않는 UID입니다. 위조품일 수 있습니다.");
      return;
    }
    const body = await res.json();
    onScanned(body.uid);
  };

  return (
    <>
      <StepHeader
        en="STEP 01 — SCAN"
        ko="UID 스캔"
        desc="제품 하단 코드를 입력하면 원장에서 즉시 조회됩니다."
      />

      <div className="field" style={{ marginBottom: 16 }}>
        <label>UID 코드</label>
        <input
          className="input"
          placeholder="PH-2609-A-000005"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
        />
      </div>
      <Button variant="secondary" block onClick={lookup} style={{ marginBottom: 20 }}>
        조회 / SCAN
      </Button>

      {error && <PhoneWarn>{error}</PhoneWarn>}

      {scanned && (
        <>
          <PhoneFigure
            label="SCANNED UID"
            value={maskUid(scanned.code)}
            note={scanned.status === "WHOLESALE" ? "원장 일치 · 정품 확인" : "원장 일치 · 상태 확인 필요"}
          />
          <PhoneRow k="제품" v={scanned.lot?.productName} />
          <PhoneRow k="LOT" v={scanned.lot?.code} />
          <PhoneRow k="현재 상태" v={scanned.status} />
        </>
      )}

      <div style={{ marginTop: "auto", paddingTop: 24 }}>
        <Button
          variant="primary"
          block
          className="blueprint"
          style={{ height: 48 }}
          disabled={!scanned}
          onClick={onNext}
        >
          <Corners />
          연령인증으로 / CONTINUE
        </Button>
      </div>
    </>
  );
}

function VerifyStep({
  consumerId,
  scanned,
  verified,
  onVerified,
  onRequested,
}: {
  consumerId: string;
  scanned: any;
  verified: boolean | null;
  onVerified: (v: boolean) => void;
  onRequested: (id: string) => void;
}) {
  const [birthDate, setBirthDate] = useState("2000-01-01");
  const [idScanned, setIdScanned] = useState(true);
  const [liveness, setLiveness] = useState(true);
  const [reasons, setReasons] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verify = async () => {
    setError(null);
    const res = await fetch(`/api/consumers/${consumerId}/verify-age`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        country: "PH",
        input: { idScanned, livenessPassed: liveness, birthDate },
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error);
      return;
    }
    onVerified(body.verification.verified);
    setReasons(body.reasons ?? null);
  };

  const requestRegistration = async () => {
    setError(null);
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "RETAIL_SALE",
        uidCode: scanned.code,
        consumerId,
        ageVerified: true,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error);
      return;
    }
    onRequested(body.request.id);
  };

  if (!scanned) {
    return (
      <>
        <StepHeader en="STEP 02 — AGE VERIFICATION" ko="연령인증" desc="먼저 UID를 스캔해주세요." />
      </>
    );
  }

  return (
    <>
      <StepHeader
        en="STEP 02 — AGE VERIFICATION"
        ko="연령인증"
        desc="RA 11900 요건에 따라 정부발급 ID 스캔과 Liveness 검사를 수행합니다."
      />

      <PhoneFigure
        label="AVP MODULE"
        value="PH · GOV-ID + LIVENESS"
        note="등록국가 판별 → 필리핀 모듈 호출"
      />

      <div className="field" style={{ marginBottom: 12 }}>
        <label>생년월일</label>
        <input
          className="input"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
        />
      </div>
      <label className="radio" style={{ marginBottom: 8 }}>
        <input type="checkbox" checked={idScanned} onChange={(e) => setIdScanned(e.target.checked)} />
        <span className="dot" style={{ borderRadius: 0, background: idScanned ? "var(--color-accent)" : undefined, borderColor: idScanned ? "var(--color-accent)" : undefined }} />
        정부발급 ID 스캔 완료
      </label>
      <label className="radio" style={{ marginBottom: 16 }}>
        <input type="checkbox" checked={liveness} onChange={(e) => setLiveness(e.target.checked)} />
        <span className="dot" style={{ borderRadius: 0, background: liveness ? "var(--color-accent)" : undefined, borderColor: liveness ? "var(--color-accent)" : undefined }} />
        Liveness 검사 통과
      </label>

      <PhoneRow k="원장 기록" v="검증완료 여부·시각·방식" />
      <PhoneRow k="신분정보 원본" v="저장하지 않음" />
      {verified !== null && <PhoneRow k="검증 결과" v={verified ? "통과" : "실패"} />}

      <div style={{ marginTop: "auto", paddingTop: 24 }}>
        {error && <PhoneWarn>{error}</PhoneWarn>}
        {verified === false && reasons && <PhoneWarn>{reasons.join(" ")}</PhoneWarn>}

        {verified ? (
          <Button variant="primary" block className="blueprint" style={{ height: 48 }} onClick={requestRegistration}>
            <Corners />
            정품 등록 신청 / REGISTER
          </Button>
        ) : (
          <Button variant="primary" block className="blueprint" style={{ height: 48 }} onClick={verify}>
            <Corners />
            인증 완료 / VERIFY
          </Button>
        )}
      </div>
    </>
  );
}

function StatusStep({ consumerId, requestId }: { consumerId: string; requestId: string | null }) {
  const [request, setRequest] = useState<any>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/requests?consumerId=${consumerId}`);
    const body = await res.json();
    const list = body.requests ?? [];
    setRequest(requestId ? list.find((r: any) => r.id === requestId) ?? list[0] : list[0]);
  }, [consumerId, requestId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!request) {
    return (
      <>
        <StepHeader en="STEP 03 — REGISTRATION" ko="정품 등록 상태" desc="아직 등록 신청 이력이 없습니다." />
        <div style={{ marginTop: "auto", paddingTop: 24 }}>
          <Button variant="secondary" block onClick={load}>
            새로고침
          </Button>
        </div>
      </>
    );
  }

  const statusLabel: Record<string, string> = {
    PENDING: "매장 승인 대기",
    COMMITTED: "정품 등록 완료",
    BLOCKED: "판매 차단됨",
    REJECTED: "매장에서 반려됨",
  };

  return (
    <>
      <StepHeader
        en="STEP 03 — REGISTRATION"
        ko={statusLabel[request.status] ?? request.status}
        desc={
          request.status === "COMMITTED"
            ? "소유권이 회원님에게 이전되었고 교환권이 1회 발급되었습니다."
            : request.status === "PENDING"
              ? "연령인증이 완료되었습니다. 매장이 소유권 이전을 커밋하면 등록이 완료됩니다."
              : "이 제품은 정상 유통 경로를 통해 확인되지 않았습니다."
        }
      />

      <PhoneFigure
        label={request.status === "COMMITTED" ? "EXCHANGE VOUCHER" : "REQUEST"}
        value={maskUid(request.uid.code)}
        note={
          request.status === "COMMITTED"
            ? `교환권 ${request.uid.voucherState === "AVAILABLE" ? `유효 · 불량/색상 교환 1회${voucherExpiryText(request.uid.voucherExpiresAt)}` : request.uid.voucherState}`
            : request.blockedReason ?? "매장 큐에서 처리 대기 중"
        }
      />

      <PhoneRow k="제품" v={request.uid.lot?.productName} />
      <PhoneRow k="트랜잭션" v="RETAIL_SALE" />
      <PhoneRow k="연령인증" v={request.ageVerified ? "완료 (RA 11900)" : "미완료"} />
      <PhoneRow k="상태" v={statusLabel[request.status] ?? request.status} />

      <div style={{ marginTop: "auto", paddingTop: 24 }}>
        {request.status === "BLOCKED" && (
          <PhoneWarn>{request.blockedReason ?? "판매가 차단되었습니다."}</PhoneWarn>
        )}
        <Button variant="secondary" block onClick={load}>
          상태 새로고침
        </Button>
      </div>
    </>
  );
}

function MyProductsStep({ consumerId }: { consumerId: string }) {
  const [uids, setUids] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetEmail, setTargetEmail] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/consumers/${consumerId}/uids`);
    const body = await res.json();
    setUids(body.uids ?? []);
  }, [consumerId]);

  useEffect(() => {
    load();
  }, [load]);

  const requestExchange = async (code: string) => {
    setError(null);
    setMessage(null);
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "EXCHANGE_TRANSFER", uidCode: code, consumerId }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error);
      return;
    }
    setMessage("교환 신청이 접수되었습니다. 매장 AS 검수 후 처리됩니다.");
  };

  const resell = async (code: string) => {
    setError(null);
    setMessage(null);

    if (!targetEmail.trim()) {
      setError("양수인 이메일을 입력해주세요.");
      return;
    }

    // 명부를 노출하지 않기 위해 이메일 단건 조회로 양수인을 확인한다.
    const lookup = await fetch("/api/consumers/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail.trim() }),
    });
    const lookupBody = await lookup.json();
    if (!lookup.ok) {
      setError(lookupBody.error);
      return;
    }

    const res = await fetch(`/api/uid/${encodeURIComponent(code)}/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        txType: "RESALE_TRANSFER",
        from: { type: "CONSUMER", consumerId },
        to: { type: "CONSUMER", consumerId: lookupBody.consumer.id },
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error);
      return;
    }
    setMessage(
      `${lookupBody.consumer.displayName}님에게 양도되었습니다. 교환권은 재발급되지 않습니다.`
    );
    load();
  };

  return (
    <>
      <StepHeader
        en="STEP 04 — MY PRODUCTS"
        ko="내 제품"
        desc="보유 중인 제품의 교환권 상태를 확인하고 교환·중고거래를 신청합니다."
      />

      {uids.length === 0 && <p className="text-muted" style={{ fontSize: 13 }}>보유한 제품이 없습니다.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {uids.map((u) => (
          <div key={u.id} className="blueprint" style={{ padding: 14, background: "transparent" }}>
            <Corners />
            <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, wordBreak: "break-all" }}>
              {maskUid(u.code)}
            </div>
            <div style={{ fontSize: 12, marginTop: 6 }} className="text-muted">
              {u.lot?.productName} · 교환권 {u.voucherState}{u.voucherState === "AVAILABLE" ? voucherExpiryText(u.voucherExpiresAt) : ""}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Button
                variant="secondary"
                style={{ flex: 1, fontSize: 12 }}
                disabled={u.voucherState !== "AVAILABLE"}
                onClick={() => requestExchange(u.code)}
              >
                교환 신청
              </Button>
              <Button
                variant="secondary"
                style={{ flex: 1, fontSize: 12 }}
                onClick={() => resell(u.code)}
              >
                중고거래 등록
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "auto", paddingTop: 24 }}>
        {error && <PhoneWarn>{error}</PhoneWarn>}
        {message && <PhoneWarn>{message}</PhoneWarn>}
        {uids.length > 0 && (
          <div className="field" style={{ marginBottom: 12 }}>
            <label>중고거래 양수인 이메일</label>
            <input
              className="input"
              type="email"
              placeholder="buyer@example.com"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
            />
          </div>
        )}
        <Button variant="secondary" block onClick={load}>
          새로고침
        </Button>
      </div>
    </>
  );
}

function VerifyBanner() {
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  return (
    <div
      className="blueprint"
      style={{
        width: 372,
        padding: 14,
        background: "var(--color-accent-100)",
        borderColor: "var(--color-accent-400)",
      }}
    >
      <Corners />
      <div style={{ fontSize: 12, lineHeight: 1.55, color: "var(--color-accent-900)" }}>
        이메일 인증이 완료되지 않았습니다. 메일의 링크를 열어 인증하면 정품 등록을 신청할 수
        있습니다.
      </div>
      <Button
        variant="secondary"
        style={{ marginTop: 10, fontSize: 12 }}
        disabled={sending}
        onClick={async () => {
          setSending(true);
          const res = await fetch("/api/auth/resend-verification", { method: "POST" });
          const body = await res.json();
          setMessage(body.message ?? body.error);
          setSending(false);
        }}
      >
        인증 메일 다시 보내기
      </Button>
      {message && (
        <div style={{ fontSize: 11, marginTop: 8 }} className="text-muted">
          {message}
        </div>
      )}
    </div>
  );
}
