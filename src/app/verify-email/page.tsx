"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Corners } from "@/components/ui/Corners";

type State = "working" | "done" | "error";

function VerifyEmail() {
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<State>("working");
  const [message, setMessage] = useState("이메일을 인증하는 중입니다...");

  const verify = useCallback(async () => {
    if (!token) {
      setState("error");
      setMessage("인증 토큰이 없습니다. 메일의 링크를 다시 확인해주세요.");
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
      setMessage(body.error ?? "인증에 실패했습니다.");
      return;
    }
    setState("done");
    setMessage("이메일 인증이 완료되었습니다. 이제 정품 등록을 신청할 수 있습니다.");
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
          {state === "done" ? "인증 완료" : state === "error" ? "인증 실패" : "인증 중"}
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{message}</p>
        <Link href="/app">소비자 앱으로 이동</Link>
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
