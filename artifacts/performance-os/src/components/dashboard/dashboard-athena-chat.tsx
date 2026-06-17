import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Bot, User, Plus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface Conversation {
  id: number;
  title: string;
}

const QUICK_PROMPTS = [
  "Analyze top campaigns",
  "Find budget waste",
  "Compare Google vs Meta",
  "Forecast next month",
];

export function DashboardAthenaChat() {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [initializing, setInitializing] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  async function startConversation() {
    setInitializing(true);
    setMessages([]);
    setStreamingContent("");
    try {
      const res = await fetch("/api/ai/conversations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Dashboard Chat" }),
      });
      if (res.ok) {
        const convo = await res.json() as Conversation;
        setConversation(convo);
      }
    } finally {
      setInitializing(false);
    }
  }

  useEffect(() => {
    void startConversation();
  }, []);

  async function sendMessage(text: string) {
    if (!text.trim() || streaming || !conversation) return;
    const userText = text.trim();
    setInput("");
    setStreaming(true);
    setStreamingContent("");

    const tempId = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "user", content: userText, createdAt: new Date().toISOString() },
    ]);

    try {
      const res = await fetch(`/api/ai/conversations/${conversation.id}/messages/stream`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userText }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => [
          ...prev,
          { id: tempId + 1, role: "assistant", content: "Error connecting to Athena. Please try again.", createdAt: new Date().toISOString() },
        ]);
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accum = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6)) as { content?: string; done?: boolean; error?: string };
            if (parsed.content) {
              accum += parsed.content;
              setStreamingContent(accum);
            }
            if (parsed.done || parsed.error) {
              const finalContent = parsed.error ? `⚠️ ${parsed.error}` : accum;
              setMessages((prev) => [
                ...prev,
                { id: Date.now(), role: "assistant", content: finalContent, createdAt: new Date().toISOString() },
              ]);
              setStreamingContent("");
              setStreaming(false);
            }
          } catch {
            // skip malformed
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "assistant", content: "Connection error. Please try again.", createdAt: new Date().toISOString() },
      ]);
      setStreamingContent("");
      setStreaming(false);
    }
  }

  return (
    <Card className="flex flex-col h-full min-h-[480px] border-border/50 bg-card/50 overflow-hidden">
      <CardHeader className="py-3 px-4 border-b border-border/50 flex-row items-center justify-between space-y-0 shrink-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="h-6 w-6 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          Athena AI
        </CardTitle>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground"
          onClick={() => void startConversation()}
          title="New conversation"
          disabled={initializing}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth" ref={scrollRef}>
        {initializing ? (
          <div className="h-full flex items-center justify-center">
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 && !streamingContent ? (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">How can I help you today?</p>
              <p className="text-xs text-muted-foreground">Ask Athena anything about your campaigns.</p>
            </div>
            <div className="grid grid-cols-1 gap-1.5 w-full">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  className="text-left text-xs px-3 py-2 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  onClick={() => void sendMessage(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex gap-2", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
              >
                <div
                  className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    msg.role === "user"
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/20 text-primary border border-primary/30"
                  )}
                >
                  {msg.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                </div>
                <div
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs whitespace-pre-wrap max-w-[85%]",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-card border border-border/50 rounded-tl-sm text-card-foreground"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Streaming response */}
            {streamingContent && (
              <div className="flex gap-2 flex-row">
                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3 w-3" />
                </div>
                <div className="px-3 py-2 rounded-xl rounded-tl-sm text-xs bg-card border border-border/50 whitespace-pre-wrap max-w-[85%]">
                  {streamingContent}
                  <span className="inline-block w-1 h-3 bg-primary/60 ml-0.5 animate-pulse rounded-sm" />
                </div>
              </div>
            )}

            {/* Typing dots when sending but no chunks yet */}
            {streaming && !streamingContent && (
              <div className="flex gap-2 flex-row">
                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center shrink-0">
                  <Bot className="h-3 w-3" />
                </div>
                <div className="px-3 py-2 rounded-xl rounded-tl-sm bg-card border border-border/50 flex items-center gap-0.5">
                  <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Input */}
      <div className="p-3 border-t border-border/50 shrink-0">
        <div className="relative flex items-center">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(input); } }}
            placeholder="Ask Athena…"
            className="pr-10 text-xs bg-background border-border rounded-xl"
            disabled={streaming || initializing || !conversation}
          />
          <Button
            size="icon"
            className="absolute right-1 h-7 w-7 rounded-lg"
            onClick={() => void sendMessage(input)}
            disabled={!input.trim() || streaming || initializing || !conversation}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
