import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "lg";
}

export function Button({ variant = "secondary", size = "md", className = "", ...rest }: Props) {
  return <button className={`btn btn-${variant} btn-${size} ${className}`.trim()} {...rest} />;
}
