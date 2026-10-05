import { ReactNode } from "react";
import { Bell } from "lucide-react";
import WmsSidebar from "@/components/WmsSidebar";

export default function WmsPageShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="shell">
      <WmsSidebar />
      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="muted">{subtitle}</p>
          </div>
          <button className="iconButton" title="Notifications">
            <Bell size={20} />
          </button>
        </header>
        {children}
      </section>
    </main>
  );
}
