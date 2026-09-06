"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Corners } from "@/components/ui/Corners";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, displayName, password, country: "PH" }),
    });
    const body = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(body.error ?? "가입에 실패했습니다.");
      return;
    }

    // 가입과 함께 세션이 발급되므로 바로 앱으로 이동한다.
    router.replace("/app");
    router.refresh();
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 32 }}>
      <form
        onSubmit={submit}
        className="blueprint"
        style={{ width: "min(420px, 100%)", padding: 28, background: "transparent" }}
      >
        <Corners />
        <div style={{ fontSize: 10, letterSpacing: "0.16em", color: "var(--color-accent-700)" }}>
          LEDGERMARK · CONSUMER
        </div>
        <h1 style={{ fontSize: 28, margin: "8px 0 6px" }}>소비자 가입</h1>
        <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 22 }} className="text-muted">
          가입 후 제품 UID를 스캔해 정품을 확인하고 등록할 수 있습니다. 연령인증은 제품 구매
          시점에 진행됩니다.
        </p>

        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="email">이메일</label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="name">이름</label>
          <input
            id="name"
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>

        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="password">비밀번호 (10자 이상)</label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="field" style={{ marginBottom: 20 }}>
          <label htmlFor="confirm">비밀번호 확인</label>
          <input
            id="confirm"
            className="input"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>

        {error && (
          <div
            style={{
              border: "1px solid var(--color-accent-400)",
              background: "var(--color-accent-100)",
              padding: "10px 12px",
              fontSize: 12,
              color: "var(--color-accent-900)",
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <Button type="submit" variant="primary" block style={{ height: 44 }} disabled={loading}>
          {loading ? "가입 중..." : "가입하기"}
        </Button>

        <div style={{ fontSize: 12, marginTop: 16, textAlign: "center" }}>
          이미 계정이 있으신가요? <Link href="/login">로그인</Link>
        </div>
      </form>
    </div>
  );
}
