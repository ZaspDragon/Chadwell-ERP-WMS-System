"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Box,
  ClipboardList,
  FileText,
  PackageCheck,
  QrCode,
  Send,
  Truck,
} from "lucide-react";

const navItems = [
  { href: "/receiving", label: "Receiving", icon: Truck },
  { href: "/pos", label: "POs", icon: FileText },
  { href: "/transfers", label: "Transfers", icon: Send },
  { href: "/pallets", label: "Pallets / LPNs", icon: QrCode },
  { href: "/putaway", label: "Putaway", icon: PackageCheck },
  { href: "/inventory", label: "Inventory", icon: Box },
];

export default function WmsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brandMark">CW</div>
        <div>
          <strong>Chadwell WMS</strong>
          <small>Warehouse Operations</small>
        </div>
      </div>

      <nav>
        <Link className={"navItem" + (pathname === "/dashboard" ? " active" : "")} href="/dashboard">
          <ClipboardList size={18} /> Dashboard
        </Link>

        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");

          return (
            <Link
              key={href}
              className={"navItem" + (active ? " active" : "")}
              href={href}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="sidebarFooter">
        <span className="dot" /> Live WMS
        <small>Supabase connected</small>
      </div>
    </aside>
  );
}
