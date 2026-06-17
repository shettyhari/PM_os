import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Eye, EyeOff, ExternalLink, Sparkles } from "lucide-react";

interface DashboardSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeyUpdated?: (isSet: boolean) => void;
}

export function DashboardSettings({ open, onOpenChange, onKeyUpdated }: DashboardSettingsProps) {
  const [geminiKey, setGeminiKey] = useState("");
  const [keySet, setKeySet] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const { toast } = useToast();

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings", { credentials: "include" });
      if (res.ok) {
        const data = await res.json() as { geminiApiKeySet: boolean };
        setKeySet(data.geminiApiKeySet);
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (open) {
      void fetchSettings();
      setGeminiKey("");
      setShowKey(false);
    }
  }, [open]);

  async function handleSave() {
    if (!geminiKey.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiApiKey: geminiKey.trim() }),
      });
      if (res.ok) {
        setKeySet(true);
        setGeminiKey("");
        toast({ title: "API key saved", description: "Athena AI is now powered by Gemini." });
        onKeyUpdated?.(true);
      } else {
        toast({ title: "Failed to save", description: "Please try again.", variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiApiKey: null }),
      });
      if (res.ok) {
        setKeySet(false);
        toast({ title: "API key removed", description: "Gemini integration disabled." });
        onKeyUpdated?.(false);
      }
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Dashboard Settings
          </SheetTitle>
          <SheetDescription>
            Configure AI and integration settings for your dashboard.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Gemini LLM Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Gemini AI (LLM)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Powers Athena AI responses</p>
              </div>
              {keySet ? (
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Configured
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground gap-1">
                  <XCircle className="w-3 h-3" /> Not set
                </Badge>
              )}
            </div>

            <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Get a free API key from{" "}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline inline-flex items-center gap-0.5"
                >
                  Google AI Studio <ExternalLink className="w-3 h-3" />
                </a>
                . Your key is stored securely in your account and never shared.
              </p>

              <div className="space-y-2">
                <Label htmlFor="gemini-key" className="text-xs font-medium">
                  {keySet ? "Replace API key" : "Enter API key"}
                </Label>
                <div className="relative">
                  <Input
                    id="gemini-key"
                    type={showKey ? "text" : "password"}
                    placeholder="AIza..."
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="pr-10 font-mono text-sm"
                    onKeyDown={(e) => { if (e.key === "Enter") void handleSave(); }}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowKey((v) => !v)}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!geminiKey.trim() || saving}
                  onClick={() => void handleSave()}
                >
                  {saving ? "Saving…" : keySet ? "Update Key" : "Save Key"}
                </Button>
                {keySet && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    disabled={removing}
                    onClick={() => void handleRemove()}
                  >
                    {removing ? "Removing…" : "Remove"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Model info */}
          <div className="rounded-lg border border-border/50 bg-muted/10 p-4 space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Model</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm">gemini-2.5-flash</span>
              <Badge variant="outline" className="text-xs">Active</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Hybrid reasoning model — fast, capable, and optimised for marketing analysis tasks.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
