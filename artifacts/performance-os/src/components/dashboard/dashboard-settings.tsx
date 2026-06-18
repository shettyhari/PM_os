import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Eye, EyeOff, ExternalLink, Sparkles } from "lucide-react";
import { SiGoogleads, SiMeta } from "react-icons/si";

interface Settings {
  geminiApiKeySet: boolean;
  googleClientIdSet: boolean;
  googleClientSecretSet: boolean;
  metaAppIdSet: boolean;
  metaAppSecretSet: boolean;
}

interface DashboardSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeyUpdated?: (isSet: boolean) => void;
  onCredentialsUpdated?: () => void;
}

function StatusBadge({ set }: { set: boolean }) {
  return set ? (
    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1 text-[11px]">
      <CheckCircle2 className="w-3 h-3" /> Set
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground gap-1 text-[11px]">
      <XCircle className="w-3 h-3" /> Not set
    </Badge>
  );
}

function SecretInput({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          placeholder={placeholder ?? "Enter value…"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10 font-mono text-sm"
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => setShow((v) => !v)}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export function DashboardSettings({ open, onOpenChange, onKeyUpdated, onCredentialsUpdated }: DashboardSettingsProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [geminiKey, setGeminiKey] = useState("");
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [metaAppId, setMetaAppId] = useState("");
  const [metaAppSecret, setMetaAppSecret] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings", { credentials: "include" });
      if (res.ok) setSettings(await res.json() as Settings);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (open) {
      void fetchSettings();
      setGeminiKey("");
      setGoogleClientId("");
      setGoogleClientSecret("");
      setMetaAppId("");
      setMetaAppSecret("");
    }
  }, [open]);

  async function save(section: string, payload: Record<string, string | null>) {
    setSaving(section);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast({ title: "Saved", description: `${section} settings updated.` });
        await fetchSettings();
        if (section === "Gemini") onKeyUpdated?.(!!payload.geminiApiKey);
        if (section === "Google Ads" || section === "Meta Ads") onCredentialsUpdated?.();
      } else {
        toast({ title: "Failed to save", variant: "destructive" });
      }
    } finally {
      setSaving(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Dashboard Settings
          </SheetTitle>
          <SheetDescription>
            Configure AI and platform integration credentials.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* ─── Gemini LLM ─── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Gemini AI (LLM)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Powers Athena AI responses</p>
              </div>
              <StatusBadge set={settings?.geminiApiKeySet ?? false} />
            </div>

            <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Get a free key from{" "}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-0.5">
                  Google AI Studio <ExternalLink className="w-3 h-3" />
                </a>
              </p>
              <SecretInput id="gemini-key" label={settings?.geminiApiKeySet ? "Replace API key" : "API key"} value={geminiKey} onChange={setGeminiKey} placeholder="AIza..." />
              <Button size="sm" className="w-full" disabled={!geminiKey.trim() || saving === "Gemini"} onClick={() => void save("Gemini", { geminiApiKey: geminiKey.trim() || null })}>
                {saving === "Gemini" ? "Saving…" : settings?.geminiApiKeySet ? "Update Key" : "Save Key"}
              </Button>
              {settings?.geminiApiKeySet && (
                <Button size="sm" variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10" disabled={saving === "GeminiRemove"} onClick={() => void save("Gemini", { geminiApiKey: null })}>
                  Remove Key
                </Button>
              )}
            </div>

            <div className="rounded-lg border border-border/50 bg-muted/10 p-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Model</span>
              <span className="text-xs font-mono font-medium">gemini-2.5-flash</span>
            </div>
          </div>

          <Separator />

          {/* ─── Google Ads ─── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SiGoogleads className="w-4 h-4 text-[#4285F4]" />
                <div>
                  <h3 className="text-sm font-semibold">Google Ads</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">OAuth app credentials</p>
                </div>
              </div>
              <StatusBadge set={settings?.googleClientIdSet ?? false} />
            </div>

            <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Create an OAuth 2.0 client in{" "}
                <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-0.5">
                  Google Cloud Console <ExternalLink className="w-3 h-3" />
                </a>{" "}
                and add <code className="font-mono bg-muted px-1 rounded">/api/oauth/callback/google</code> as a redirect URI.
              </p>
              <SecretInput id="google-client-id" label="Client ID" value={googleClientId} onChange={setGoogleClientId} placeholder="*.apps.googleusercontent.com" />
              <SecretInput id="google-client-secret" label="Client Secret" value={googleClientSecret} onChange={setGoogleClientSecret} placeholder="GOCSPX-…" />
              <Button
                size="sm" className="w-full"
                disabled={(!googleClientId.trim() && !googleClientSecret.trim()) || saving === "Google Ads"}
                onClick={() => void save("Google Ads", {
                  googleClientId: googleClientId.trim() || null,
                  googleClientSecret: googleClientSecret.trim() || null,
                })}
              >
                {saving === "Google Ads" ? "Saving…" : settings?.googleClientIdSet ? "Update Credentials" : "Save Credentials"}
              </Button>
            </div>
          </div>

          <Separator />

          {/* ─── Meta Ads ─── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SiMeta className="w-4 h-4 text-[#0082FB]" />
                <div>
                  <h3 className="text-sm font-semibold">Meta Ads</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Facebook app credentials</p>
                </div>
              </div>
              <StatusBadge set={settings?.metaAppIdSet ?? false} />
            </div>

            <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Create a Meta App in{" "}
                <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-0.5">
                  Meta for Developers <ExternalLink className="w-3 h-3" />
                </a>{" "}
                and add <code className="font-mono bg-muted px-1 rounded">/api/oauth/callback/meta</code> as a valid redirect URI.
              </p>
              <SecretInput id="meta-app-id" label="App ID" value={metaAppId} onChange={setMetaAppId} placeholder="1234567890…" />
              <SecretInput id="meta-app-secret" label="App Secret" value={metaAppSecret} onChange={setMetaAppSecret} placeholder="abcdef1234…" />
              <Button
                size="sm" className="w-full"
                disabled={(!metaAppId.trim() && !metaAppSecret.trim()) || saving === "Meta Ads"}
                onClick={() => void save("Meta Ads", {
                  metaAppId: metaAppId.trim() || null,
                  metaAppSecret: metaAppSecret.trim() || null,
                })}
              >
                {saving === "Meta Ads" ? "Saving…" : settings?.metaAppIdSet ? "Update Credentials" : "Save Credentials"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
