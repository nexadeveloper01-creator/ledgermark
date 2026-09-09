"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Corners } from "@/components/ui/Corners";
import { useT, LangToggle, type Dict } from "@/lib/i18n/web";

const D: Dict = {
  t: { ko: "비밀번호 재설정", en: "Reset password" },
  sub: { ko: "가입한 이메일 주소를 입력하시면 재설정 링크를 보내드립니다.", en: "Enter your account email and we'll send a reset link." },
  email: { ko: "이메일", en: "Email" },
  loading: { ko: "전송 중...", en: "Sending..." },
  submit: { ko: "재설정 링크 받기", en: "Send reset link" },
  back: { ko: "로그인으로 돌아가기", en: "Back to sign in" },
  fail: { ko: "요청에 실패했습니다.", en: "Request failed." },
};

export default function ForgotPasswordPage() {
  const t = useT(D);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(body.error ?? t("fail"));
      return;
    }
    setMessage(body.message);
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 32 }}>
      <form
        onSubmit={submit}
        className="blueprint"
        style={{ width: "min(420px, 100%)", padding: 28, background: "transparent" }}
      >
        <Corners />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.16em", color: "var(--color-accent-700)" }}>
            LEDGERMARK
          </div>
          <LangToggle />
        </div>
        <h1 style={{ fontSize: 26, margin: "8px 0 6px" }}>{t("t")}</h1>
        <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 20 }} className="text-muted">
          {t("sub")}
        </p>

        <div className="field" style={{ marginBottom: 20 }}>
          <label htmlFor="email">{t("email")}</label>
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

        {message && (
          <div
            style={{
              border: "1px solid var(--color-divider)",
              padding: "10px 12px",
              fontSize: 12,
              lineHeight: 1.55,
              marginBottom: 16,
            }}
          >
            {message}
          </div>
        )}
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
          {loading ? t("loading") : t("submit")}
        </Button>

        <div style={{ fontSize: 12, marginTop: 16, textAlign: "center" }}>
          <Link href="/login">{t("back")}</Link>
        </div>
      </form>
    </div>
  );
}
