"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Corners } from "@/components/ui/Corners";
import { useT, type Dict } from "@/lib/i18n/web";

const D: Dict = {
  working: { ko: "이메일을 인증하는 중입니다...", en: "Verifying your email..." },
  notoken: { ko: "인증 토큰이 없습니다. 메일의 링크를 다시 확인해주세요.", en: "No verification token. Please re-check the link in your email." },
  fail: { ko: "인증에 실패했습니다.", en: "Verification failed." },
  done: { ko: "이메일 인증이 완료되었습니다. 이제 정품 등록을 신청할 수 있습니다.", en: "Your email is verified. You can now register products." },
  hDone: { ko: "인증 완료", en: "Verified" },
  hError: { ko: "인증 실패", en: "Verification failed" },
  hWorking: { ko: "인증 중", en: "Verifying" },
  toApp: { ko: "소비자 앱으로 이동", en: "Go to the consumer app" },
};

type State = "working" | "done" | "error";

function VerifyEmail() {
  const token = useSearchParams().get("token") ?? "";
  const t = useT(D);
  const [state, setState] = useState<State>("working");
  const [msgKey, setMsgKey] = useState("working");
  const [serverErr, setServerErr] = useState<string | null>(null);

  const verify = useCallback(async () => {
    if (!token) {
      setState("error");
      setMsgKey("notoken");
      return;
    }

    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const body = await res.json();

    if (!res.ok) {
      setState("error");
      if (body.error) setServerErr(body.error);
      else setMsgKey("fail");
      return;
    }
    setState("done");
    setMsgKey("done");
  }, [token]);

  useEffect(() => {
    verify();
  }, [verify]);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 32 }}>
      <div
        className="blueprint"
        style={{ width: "min(420px, 100%)", padding: 28, background: "transparent" }}
      >
        <Corners />
        <div style={{ fontSize: 10, letterSpacing: "0.16em", color: "var(--color-accent-700)" }}>
          LEDGERMARK · EMAIL VERIFICATION
        </div>
        <h1 style={{ fontSize: 26, margin: "8px 0 10px" }}>
          {state === "done" ? t("hDone") : state === "error" ? t("hError") : t("hWorking")}
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{serverErr ?? t(msgKey)}</p>
        <Link href="/app">{t("toApp")}</Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmail />
    </Suspense>
  );
}
