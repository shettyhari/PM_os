import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { AuthProvider } from "@/context/auth-context";
import { RequireAuth } from "@/components/auth/require-auth";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Campaigns from "@/pages/campaigns";
import Analytics from "@/pages/analytics";
import Athena from "@/pages/athena";
import Crm from "@/pages/crm";
import Alerts from "@/pages/alerts";
import Integrations from "@/pages/integrations";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import Windsor from "@/pages/windsor";
import Attribution from "@/pages/attribution";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  return (
    <Switch>
      <Route path="/login" component={Login} />

      <Route>
        <RequireAuth>
          <AppLayout>
            <Switch>
              <Route path="/" component={() => <Redirect to="/dashboard" />} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/campaigns" component={Campaigns} />
              <Route path="/analytics" component={Analytics} />
              <Route path="/athena" component={Athena} />
              <Route path="/crm" component={Crm} />
              <Route path="/alerts" component={Alerts} />
              <Route path="/integrations" component={Integrations} />
              <Route path="/reports" component={Reports} />
              <Route path="/settings" component={Settings} />
              <Route path="/windsor" component={Windsor} />
              <Route path="/attribution" component={Attribution} />
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        </RequireAuth>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="performanceos-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
