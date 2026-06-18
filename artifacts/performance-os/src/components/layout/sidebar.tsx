import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Megaphone, 
  BarChart3, 
  Bot, 
  Users, 
  Bell, 
  Blocks, 
  FileBarChart, 
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  X
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useListAlerts } from "@workspace/api-client-react";
import { PerformanceLogo } from "@/components/ui/performance-logo";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobile: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Megaphone, label: "Campaigns", href: "/campaigns" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: Bot, label: "Athena AI", href: "/athena" },
  { icon: Users, label: "CRM", href: "/crm" },
  { icon: Bell, label: "Alerts", href: "/alerts", badge: "alerts" },
  { icon: Blocks, label: "Integrations", href: "/integrations" },
  { icon: FileBarChart, label: "Reports", href: "/reports" },
];

export function Sidebar({ isCollapsed, onToggle, isMobile, mobileOpen, onMobileClose }: SidebarProps) {
  const [location] = useLocation();
  const { data: alerts } = useListAlerts({ status: "unread" });
  const unreadAlertsCount = alerts?.length || 0;

  const collapsed = isMobile ? false : isCollapsed;

  function handleNavClick() {
    if (isMobile) onMobileClose();
  }

  const sidebarContent = (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-sidebar transition-all duration-300 ease-in-out z-40",
        isMobile
          ? "w-72 h-full"
          : collapsed
          ? "w-[72px]"
          : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border/50">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <PerformanceLogo size={34} />
          {!collapsed && (
            <div className="overflow-hidden">
              <span className="font-bold tracking-tight truncate text-sidebar-foreground text-[15px] leading-none block">
                PerformanceOS
              </span>
              <span className="text-[10px] text-sidebar-foreground/40 font-medium tracking-widest uppercase block mt-0.5">
                AI Marketing OS
              </span>
            </div>
          )}
        </div>
        {collapsed && !isMobile && (
          <div className="mx-auto">
            <PerformanceLogo size={34} />
          </div>
        )}
        {isMobile && (
          <button
            onClick={onMobileClose}
            className="ml-auto p-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1.5">
        {navItems.map((item) => {
          const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/dashboard");
          const badgeCount = item.badge === "alerts" ? unreadAlertsCount : 0;

          const linkContent = (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                "flex items-center rounded-md transition-colors relative group",
                collapsed ? "justify-center h-10 w-10" : "px-3 py-2.5 gap-3",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground")} />

              {!collapsed && <span className="truncate">{item.label}</span>}

              {!collapsed && badgeCount > 0 && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center justify-center min-w-[20px]">
                  {badgeCount}
                </span>
              )}

              {collapsed && badgeCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive border-2 border-sidebar" />
              )}
            </Link>
          );

          if (collapsed && !isMobile) {
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" className="flex items-center gap-2">
                  {item.label}
                  {badgeCount > 0 && (
                    <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {badgeCount}
                    </span>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          }

          return linkContent;
        })}
      </div>

      <div className="p-3 border-t border-border/50 flex flex-col gap-1.5">
        <Link
          href="/settings"
          onClick={handleNavClick}
          className={cn(
            "flex items-center rounded-md transition-colors",
            collapsed ? "justify-center h-10 w-10" : "px-3 py-2.5 gap-3",
            location.startsWith("/settings")
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          )}
        >
          <Settings className={cn("h-5 w-5 shrink-0", location.startsWith("/settings") ? "text-primary" : "text-sidebar-foreground/50")} />
          {!collapsed && <span>Settings</span>}
        </Link>

        {!isMobile && (
          <button
            onClick={onToggle}
            className={cn(
              "flex items-center rounded-md transition-colors text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground mt-2",
              collapsed ? "justify-center h-10 w-10" : "px-3 py-2.5 gap-3"
            )}
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        )}
      </div>
    </aside>
  );

  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div
          className={cn(
            "fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
            mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
          onClick={onMobileClose}
          aria-hidden="true"
        />
        {/* Drawer */}
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {sidebarContent}
        </div>
      </>
    );
  }

  return sidebarContent;
}
