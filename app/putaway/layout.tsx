import { ReactNode } from "react";
import WmsAuthGuard from "@/components/WmsAuthGuard";

export default function Layout({ children }: { children: ReactNode }) {
  return <WmsAuthGuard>{children}</WmsAuthGuard>;
}
