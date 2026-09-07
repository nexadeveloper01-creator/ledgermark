"use client";

import { useSyncExternalStore } from "react";

// 웹(콘솔) 경량 다국어. 브라우저 언어에 종속되며 localStorage 오버라이드로 전환한다.
// useSyncExternalStore로 언어 변경 시 이 훅을 쓰는 모든 컴포넌트가 리렌더된다(Provider 불필요).
export type Lang = "ko" | "en";
const KEY = "lm_web_lang";

let override: Lang | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function loadOnce() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  const v = window.localStorage.getItem(KEY);
  if (v === "ko" || v === "en") override = v;
}

function detect(): Lang {
  if (typeof navigator === "undefined") return "ko";
  return navigator.language?.toLowerCase().startsWith("ko") ? "ko" : "en";
}

export function currentLang(): Lang {
  loadOnce();
  return override ?? detect();
}

export function setLang(lang: Lang | null) {
  override = lang;
  if (typeof window !== "undefined") {
    if (lang) window.localStorage.setItem(KEY, lang);
    else window.localStorage.removeItem(KEY);
  }
  listeners.forEach((f) => f());
}

export function prefLang(): Lang | null {
  loadOnce();
  return override;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useLang(): Lang {
  // 서버 스냅샷은 'ko' 고정(하이드레이션 후 클라이언트 값으로 갱신).
  return useSyncExternalStore(subscribe, () => currentLang(), () => "ko");
}

// 번역 훅. t('key') 또는 t('key',{n:'3'}) — 문자열은 페이지에서 인라인 맵으로 전달.
export function useT(dict: Dict) {
  const lang = useLang();
  return (key: string, args?: Record<string, string>) => {
    const row = dict[key];
    let s = row ? row[lang] ?? row.en ?? key : key;
    if (args) for (const k of Object.keys(args)) s = s.split(`{${k}}`).join(args[k]!);
    return s;
  };
}

export type Dict = Record<string, { ko: string; en: string }>;

// 콘솔 상단에 놓는 언어 토글(KO / EN).
export function LangToggle() {
  const lang = useLang();
  const btn = (l: Lang, label: string) => (
    <button
      type="button"
      onClick={() => setLang(l)}
      aria-pressed={lang === l}
      style={{
        fontFamily: "ui-monospace, Menlo, monospace",
        fontSize: 11,
        letterSpacing: "0.08em",
        padding: "3px 9px",
        cursor: "pointer",
        border: "1px solid var(--color-divider)",
        background: lang === l ? "var(--color-accent)" : "transparent",
        color: lang === l ? "#fff" : "var(--color-muted, #5C6577)",
      }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ display: "inline-flex", borderRadius: 6, overflow: "hidden" }}>
      {btn("ko", "KO")}
      {btn("en", "EN")}
    </div>
  );
}
