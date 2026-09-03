import { Icon, type IconName } from "./icons";

export type PageKey = "dashboard" | "timer" | "stats" | "history" | "settings";

const ITEMS: { key: PageKey; label: string; icon: IconName }[] = [
  { key: "dashboard", label: "Tableau de bord", icon: "dashboard" },
  { key: "timer", label: "Chronomètre", icon: "timer" },
  { key: "stats", label: "Statistiques", icon: "stats" },
  { key: "history", label: "Historique", icon: "history" },
  { key: "settings", label: "Paramètres", icon: "settings" },
];

interface Props {
  page: PageKey;
  onNavigate: (page: PageKey) => void;
}

export function Sidebar({ page, onNavigate }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-dot" />
        Timeo
      </div>
      <nav className="sidebar-nav">
        {ITEMS.map((item) => (
          <button
            key={item.key}
            className={"nav-item" + (page === item.key ? " is-active" : "")}
            onClick={() => onNavigate(item.key)}
          >
            <span className="nav-icon">
              <Icon name={item.icon} />
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-foot">Pour Francis Mboula</div>
    </aside>
  );
}
