import { Search, Bell, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useListAlerts } from "@workspace/api-client-react";
import { useTheme } from "@/components/providers/theme-provider";
import { useAuth } from "@/context/auth-context";
import { Link, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export function TopNav() {
  const { theme, setTheme } = useTheme();
  const { user, isLoading: isUserLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const { data: alerts } = useListAlerts({ status: "unread" });

  const unreadCount = alerts?.length || 0;

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() ?? "OS";

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-6">
      <div className="flex-1 flex items-center">
        <div className="relative w-full max-w-md hidden md:flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns, leads, or ask Athena..."
            className="pl-9 bg-background/50 border-border/50 focus-visible:ring-primary/30 rounded-full h-9 shadow-none"
          />
          <div className="absolute right-3 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50 hidden lg:block">
            ⌘K
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/alerts">
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1.5 h-2 w-2 rounded-full bg-destructive border-2 border-card" />
            )}
          </Button>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              {isUserLoading ? (
                <Skeleton className="h-9 w-9 rounded-full" />
              ) : (
                <Avatar className="h-9 w-9 border border-border/50 shadow-sm">
                  <AvatarImage src={user?.avatarUrl || ""} alt={user?.name || "User"} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name ?? "Loading…"}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email ?? "…"}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                Profile Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Theme</p>
              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-md border border-border/50">
                {(["light", "dark", "system"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`flex-1 text-xs py-1 rounded capitalize transition-colors ${
                      theme === t
                        ? "bg-background shadow-sm text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => { void handleLogout(); }}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer gap-2"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
