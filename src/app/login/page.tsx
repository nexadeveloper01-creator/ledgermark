"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Corners } from "@/components/ui/Corners";

const HOME_BY_ROLE: Record<string, string> = {
  ADMIN: "/console",
  GOV_INSPECTOR: "/console",
  FIELD_OFFICER: "/field",
  PARTNER_STAFF: "/partner",
  CONSUMER: "/app",
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(body.error ?? "로그인에 실패했습니다.");
      return;
    }

    router.replace(next || HOME_BY_ROLE[body.user.role] || "/");
    router.refresh();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 32,
      }}
    >
      <form
        onSubmit={submit}
        className="blueprint"
        style={{ width: "min(400px, 100%)", padding: 28, background: "transparent" }}
      >
        <Corners />
        <div style={{ fontSize: 10, letterSpacing: "0.16em", color: "var(--color-accent-700)" }}>
          LEDGERMARK
        </div>
        <h1 style={{ fontSize: 28, margin: "8px 0 6px" }}>로그인</h1>
        <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 22 }} className="text-muted">
          계정 권한에 따라 관제 콘솔·매장 웹·단속 단말·소비자 앱으로 이동합니다.
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

        <div className="field" style={{ marginBottom: 20 }}>
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          {loading ? "확인 중..." : "로그인"}
        </Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
