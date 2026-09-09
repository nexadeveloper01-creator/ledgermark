"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Corners } from "@/components/ui/Corners";
import { useT, LangToggle, type Dict } from "@/lib/i18n/web";

// 로그인 정보 저장 키. 체크 시 이메일·비밀번호를 저장해 다음 방문에 자동 로그인한다.
// 파일럿/테스트 편의 기능 — 기기 로컬(localStorage)에만 저장된다.
const SAVED_LOGIN_KEY = "lm_saved_login";

const D: Dict = {
  "t": { ko: "로그인", en: "Sign in" },
  "sub": { ko: "계정 권한에 따라 관제 콘솔·매장 웹·단속 단말·소비자 앱으로 이동합니다.", en: "You'll be routed to the console, store web, field terminal, or consumer app by your role." },
  "email": { ko: "이메일", en: "Email" },
  "pw": { ko: "비밀번호", en: "Password" },
  "loading": { ko: "확인 중...", en: "Signing in..." },
  "fail": { ko: "로그인에 실패했습니다.", en: "Sign-in failed." },
  "forgot": { ko: "비밀번호를 잊으셨나요?", en: "Forgot your password?" },
  "remember": { ko: "로그인 정보 저장 (다음에 자동 로그인)", en: "Save login (auto sign-in next time)" },
  "autoLogin": { ko: "저장된 정보로 자동 로그인 중...", en: "Signing in with saved login..." },
};

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
  const doSwitch = params.get("switch");
  const prefillEmail = params.get("email");

  const t = useT(D);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);
  const autoTried = useRef(false);

  const doLogin = useCallback(
    async (emailArg: string, passwordArg: string, rememberArg: boolean) => {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailArg, password: passwordArg }),
      });
      const body = await res.json();

      if (!res.ok) {
        // 저장된 정보로 자동 로그인에 실패하면(비번 변경·비활성 등) 저장분을 지운다.
        try {
          window.localStorage.removeItem(SAVED_LOGIN_KEY);
        } catch {
          /* localStorage 접근 불가 환경 무시 */
        }
        setLoading(false);
        setAutoLogin(false);
        setError(body.error ?? t("fail"));
        return;
      }

      // 성공 시 저장 여부에 따라 로컬에 보관하거나 제거한다.
      try {
        if (rememberArg) {
          window.localStorage.setItem(SAVED_LOGIN_KEY, JSON.stringify({ email: emailArg, password: passwordArg }));
        } else {
          window.localStorage.removeItem(SAVED_LOGIN_KEY);
        }
      } catch {
        /* localStorage 접근 불가 환경 무시 */
      }

      router.replace(next || (body.user.isDeveloper ? "/dev" : HOME_BY_ROLE[body.user.role]) || "/");
      router.refresh();
    },
    [next, router, t]
  );

  // 마운트 시 동작:
  //  - switch=1(계정 전환 링크): 기존 세션·저장 로그인을 지우고 이메일만 채워 둔다.
  //    (다른 역할로 로그인돼 있어도 그 계정 화면으로 갈 수 있게 하는 데모 편의)
  //  - 그 외: 저장된 로그인 정보가 있으면 자동 로그인 1회 시도.
  useEffect(() => {
    if (autoTried.current) return;
    autoTried.current = true;

    if (doSwitch) {
      try {
        window.localStorage.removeItem(SAVED_LOGIN_KEY);
      } catch {
        /* localStorage 접근 불가 환경 무시 */
      }
      // 기존 세션을 끊어 이 링크가 항상 의도한 계정 로그인 화면이 되게 한다.
      fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      if (prefillEmail) setEmail(prefillEmail);
      return;
    }

    let saved: { email?: string; password?: string } | null = null;
    try {
      const raw = window.localStorage.getItem(SAVED_LOGIN_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch {
      saved = null;
    }
    if (saved?.email && saved?.password) {
      setEmail(saved.email);
      setPassword(saved.password);
      setRemember(true);
      setAutoLogin(true);
      void doLogin(saved.email, saved.password, true);
    }
  }, [doLogin, doSwitch, prefillEmail]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void doLogin(email, password, remember);
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.16em", color: "var(--color-accent-700)" }}>
            LEDGERMARK
          </div>
          <LangToggle />
        </div>
        <h1 style={{ fontSize: 28, margin: "8px 0 6px" }}>{t("t")}</h1>
        <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 22 }} className="text-muted">
          {t("sub")}
        </p>

        <div className="field" style={{ marginBottom: 12 }}>
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

        <div className="field" style={{ marginBottom: 20 }}>
          <label htmlFor="password">{t("pw")}</label>
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

        <label
          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 16, cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            style={{ width: 15, height: 15 }}
          />
          {t("remember")}
        </label>

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
          {autoLogin ? t("autoLogin") : loading ? t("loading") : t("t")}
        </Button>

        <div style={{ fontSize: 12, marginTop: 16, textAlign: "center" }}>
          <Link href="/forgot-password">{t("forgot")}</Link>
        </div>
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
