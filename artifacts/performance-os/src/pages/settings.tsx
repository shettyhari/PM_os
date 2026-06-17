import { useTheme } from "@/components/providers/theme-provider";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Sun, Moon, Monitor } from "lucide-react";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { data: user, isLoading } = useGetCurrentUser();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your profile and application preferences.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your personal information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <div className="space-y-2"><Skeleton className="h-4 w-12" /><Skeleton className="h-10 w-full" /></div>
                <div className="space-y-2"><Skeleton className="h-4 w-12" /><Skeleton className="h-10 w-full" /></div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user?.avatarUrl || ""} />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                      {user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || "OS"}
                    </AvatarFallback>
                  </Avatar>
                  <Button variant="outline" size="sm">Change Avatar</Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" defaultValue={user?.name} className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" defaultValue={user?.email} className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org">Organization</Label>
                  <Input id="org" defaultValue={user?.organizationName ?? ""} className="bg-background" />
                </div>
                <Button>Save Changes</Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize the look and feel of PerformanceOS.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>Theme Preference</Label>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className={`h-24 flex flex-col gap-2 ${theme === 'light' ? 'border-primary bg-primary/5 text-primary' : 'text-muted-foreground'}`}
                  onClick={() => setTheme("light")}
                >
                  <Sun className="h-6 w-6" />
                  <span>Light</span>
                </Button>
                <Button
                  variant="outline"
                  className={`h-24 flex flex-col gap-2 ${theme === 'dark' ? 'border-primary bg-primary/5 text-primary' : 'text-muted-foreground'}`}
                  onClick={() => setTheme("dark")}
                >
                  <Moon className="h-6 w-6" />
                  <span>Dark</span>
                </Button>
                <Button
                  variant="outline"
                  className={`h-24 flex flex-col gap-2 ${theme === 'system' ? 'border-primary bg-primary/5 text-primary' : 'text-muted-foreground'}`}
                  onClick={() => setTheme("system")}
                >
                  <Monitor className="h-6 w-6" />
                  <span>System</span>
                </Button>
              </div>
            </div>
            
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3 mt-6">
              <h4 className="text-sm font-medium">Density</h4>
              <p className="text-xs text-muted-foreground">PerformanceOS uses a high-density layout by default to maximize data visibility for power users.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
