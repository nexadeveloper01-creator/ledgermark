import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

function classes(variant: Variant, block: boolean | undefined, extra: string) {
  return ["btn", `btn-${variant}`, block && "btn-block", extra].filter(Boolean).join(" ");
}

export function Button({
  variant = "secondary",
  block,
  className = "",
  ...props
}: {
  variant?: Variant;
  block?: boolean;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={classes(variant, block, className)} {...props} />;
}

export function LinkButton({
  variant = "secondary",
  block,
  className = "",
  ...props
}: {
  variant?: Variant;
  block?: boolean;
  className?: string;
} & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a className={classes(variant, block, className)} {...props} />;
}
