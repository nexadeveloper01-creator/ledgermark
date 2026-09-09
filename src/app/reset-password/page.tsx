"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Corners } from "@/components/ui/Corners";
import { useT, type Dict } from "@/lib/i18n/web";

const D: Dict = {
  doneT: { ko: "재설정 완료", en: "Password reset" },
  doneBody: { ko: "비밀번호가 변경되었습니다. 기존에 로그인된 기기에서는 모두 로그아웃되었습니다.", en: "Your password has been changed. All existing sessions were signed out." },
  loginCta: { ko: "로그인하기", en: "Sign in" },
  t: { ko: "새 비밀번호 설정", en: "Set a new password" },
  pw: { ko: "새 비밀번호 (10자 이상)", en: "New password (10+ chars)" },
  confirm: { ko: "비밀번호 확인", en: "Confirm password" },
  mismatch: { ko: "비밀번호가 일치하지 않습니다.", en: "Passwords do not match." },
  fail: { ko: "재설정에 실패했습니다.", en: "Reset failed." },
  loading: { ko: "변경 중...", en: "Changing..." },
  submit: { ko: "비밀번호 변경", en: "Change password" },
  expired: { ko: "링크가 만료되었나요?", en: "Link expired?" },
};

function ResetPassword() {
  const t = useT(D);
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError(t("mismatch"));
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const body = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(body.error ?? t("fail"));
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 32 }}>
        <div
          className="blueprint"
          style={{ width: "min(420px, 100%)", padding: 28, background: "transparent" }}
        >
          <Corners />
          <h1 style={{ fontSize: 26, margin: "0 0 10px" }}>{t("doneT")}</h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
            {t("doneBody")}
          </p>
          <Button variant="primary" block style={{ height: 44 }} onClick={() => router.replace("/login")}>
            {t("loginCta")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 32 }}>
      <form
        onSubmit={submit}
        className="blueprint"
        style={{ width: "min(420px, 100%)", padding: 28, background: "transparent" }}
      >
        <Corners />
        <div style={{ fontSize: 10, letterSpacing: "0.16em", color: "var(--color-accent-700)" }}>
          LEDGERMARK
        </div>
        <h1 style={{ fontSize: 26, margin: "8px 0 16px" }}>{t("t")}</h1>

        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="password">{t("pw")}</label>
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
          <label htmlFor="confirm">{t("confirm")}</label>
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
          {loading ? t("loading") : t("submit")}
        </Button>

        <div style={{ fontSize: 12, marginTop: 16, textAlign: "center" }}>
          <Link href="/forgot-password">{t("expired")}</Link>
        </div>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPassword />
    </Suspense>
  );
}
