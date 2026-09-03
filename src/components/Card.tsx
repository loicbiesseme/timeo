import type { ReactNode } from "react";

interface Props {
  title?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Card({ title, actions, className = "", children }: Props) {
  return (
    <section className={`card ${className}`.trim()}>
      {(title || actions) && (
        <header className="card-head">
          {title && <span className="card-title">{title}</span>}
          {actions && <span className="card-actions">{actions}</span>}
        </header>
      )}
      {children}
    </section>
  );
}
