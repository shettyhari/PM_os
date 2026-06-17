import { ReactNode, useState } from "react";
import { Sidebar } from "./sidebar";
import { TopNav } from "./top-nav";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      <div className="flex flex-1 flex-col min-w-0">
        <TopNav />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
