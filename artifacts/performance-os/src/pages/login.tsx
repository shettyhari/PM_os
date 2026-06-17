import { useEffect } from "react";
import { Loader2, Zap } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useLocation } from "wouter";

export default function Login() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-violet-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-[400px]">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-lg shadow-primary/20">
            <Zap className="h-5 w-5 text-white fill-white" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            PerformanceOS
          </span>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl shadow-black/20 p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Sign in to your marketing OS
            </p>
          </div>

          <button
            onClick={login}
            className="w-full h-10 font-medium rounded-md bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90 text-white shadow-lg shadow-primary/20 border-0 transition-all"
          >
            Log in
          </button>
        </div>
      </div>
    </div>
  );
}
