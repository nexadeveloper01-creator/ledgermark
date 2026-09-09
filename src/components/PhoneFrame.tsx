import type { ReactNode } from "react";
import { Corners } from "@/components/ui/Corners";

// 소비자 앱 화면을 감싸는 기기 프레임 (디자인 프로토타입의 372px 청사진 프레임).
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className="blueprint"
      style={{ width: 372, flex: "none", background: "var(--color-bg)", padding: 0 }}
    >
      <Corners />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderBottom: "1px solid var(--color-divider)",
          fontSize: 11,
          letterSpacing: "0.08em",
        }}
      >
        <span>09:41</span>
        <span style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.16em" }}>CONIAMARK</span>
        <span className="text-muted">PH</span>
      </div>
      <div
        style={{
          padding: "24px 20px 28px",
          minHeight: 620,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function PhoneFigure({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="blueprint" style={{ background: "transparent", padding: 18, marginBottom: 20 }}>
      <Corners />
      <div style={{ fontSize: 10, letterSpacing: "0.14em" }} className="text-muted">
        {label}
      </div>
      <div
        style={{
          fontFamily: "ui-monospace, Menlo, monospace",
          fontSize: 17,
          marginTop: 8,
          wordBreak: "break-all",
        }}
      >
        {value}
      </div>
      {note !== undefined && (
        <div style={{ fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>{note}</div>
      )}
    </div>
  );
}

export function PhoneRow({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "9px 0",
        borderTop: "1px solid var(--color-divider)",
        fontSize: 13,
      }}
    >
      <span className="text-muted">{k}</span>
      <span style={{ textAlign: "right" }}>{v}</span>
    </div>
  );
}

export function PhoneWarn({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid var(--color-accent-400)",
        background: "var(--color-accent-100)",
        padding: "12px 14px",
        fontSize: 12,
        lineHeight: 1.55,
        color: "var(--color-accent-900)",
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}
