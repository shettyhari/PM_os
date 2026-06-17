import { ReactNode, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, login } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      login();
    }
  }, [isLoading, isAuthenticated, login]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading PerformanceOS…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
