import { useState, useRef, useEffect } from "react";
import { useListConversations, useGetSuggestedPrompts, useSendMessage, useCreateConversation, useGetConversationMessages, getGetConversationMessagesQueryKey } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, Plus, Sparkles, RefreshCw, Database } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface AiInsight {
  id: number;
  content: string;
  title: string;
  date: string;
  createdAt: string;
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) return null;
  return res.json();
}

export default function Athena() {
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [briefing, setBriefing] = useState<AiInsight | null | undefined>(undefined);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: isLoadingChats } = useListConversations();
  const { data: prompts } = useGetSuggestedPrompts();
  const { data: messages, isLoading: isLoadingMessages } = useGetConversationMessages(
    activeChatId ?? 0,
    { query: { enabled: !!activeChatId, queryKey: getGetConversationMessagesQueryKey(activeChatId ?? 0) } }
  );

  const createChat = useCreateConversation();
  const sendMessage = useSendMessage();

  useEffect(() => {
    if (conversations?.length && !activeChatId) {
      setActiveChatId(conversations[0].id);
    }
  }, [conversations, activeChatId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load morning briefing
  useEffect(() => {
    void loadBriefing();
  }, []);

  async function loadBriefing() {
    const existing = await apiFetch("/windsor/insights/today") as AiInsight | null;
    if (existing) {
      setBriefing(existing);
    } else {
      setBriefing(null);
    }
  }

  async function generateBriefing() {
    setGeneratingBriefing(true);
    try {
      const result = await apiFetch("/windsor/insights/generate", { method: "POST", body: JSON.stringify({}) }) as AiInsight | null;
      setBriefing(result);
    } finally {
      setGeneratingBriefing(false);
    }
  }

  const handleSend = async () => {
    if (!input.trim()) return;

    let currentId = activeChatId;
    if (!currentId) {
      const newChat = await createChat.mutateAsync({ data: { title: input.substring(0, 30) } });
      currentId = newChat.id;
      setActiveChatId(currentId);
    }

    const content = input;
    setInput("");
    sendMessage.mutate({ id: currentId, data: { content } });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const isEmpty = !activeChatId || (messages?.length === 0 && !isLoadingMessages);

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col md:flex-row gap-3">
      {/* Sidebar */}
      <Card className="w-full md:w-60 lg:w-72 flex flex-col shrink-0 border-border/50 bg-sidebar/30 backdrop-blur-md overflow-hidden">
        <div className="p-3 border-b border-border/50">
          <Button
            className="w-full justify-start gap-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 h-9 text-sm"
            onClick={() => setActiveChatId(null)}
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1 px-2 py-2">
          {isLoadingChats ? (
            <div className="space-y-1.5 p-1">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-full rounded-md" />)}
            </div>
          ) : conversations?.map((chat) => (
            <Button
              key={chat.id}
              variant={activeChatId === chat.id ? "secondary" : "ghost"}
              className="w-full justify-start font-normal mb-0.5 h-9 px-3 text-xs"
              onClick={() => setActiveChatId(chat.id)}
            >
              <span className="truncate">{chat.title}</span>
            </Button>
          ))}
        </ScrollArea>

        {/* Morning Briefing Panel */}
        <div className="border-t border-border/50 p-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Daily Briefing</p>
          {briefing === undefined ? (
            <Skeleton className="h-16 w-full rounded-md" />
          ) : briefing ? (
            <div
              className="p-2.5 rounded-md bg-primary/5 border border-primary/20 cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => {
                setInput(briefing.content.split("\n")[0]?.replace(/^#+\s/, "") ?? "");
              }}
            >
              <p className="text-xs font-medium text-primary line-clamp-2">{briefing.title}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {new Date(briefing.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs border-dashed"
              onClick={() => void generateBriefing()}
              disabled={generatingBriefing}
            >
              {generatingBriefing
                ? <><RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />Generating…</>
                : <><Sparkles className="h-3 w-3 mr-1.5" />Generate Briefing</>
              }
            </Button>
          )}
        </div>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col border-border/50 relative overflow-hidden bg-card/50">
        <div className="flex-1 overflow-y-auto p-4 md:p-6" ref={scrollRef}>
          {isEmpty ? (
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto space-y-6">
              {/* Morning Briefing Hero */}
              {briefing ? (
                <div className="w-full p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">Today's Briefing</span>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                    <ReactMarkdown>{briefing.content}</ReactMarkdown>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-3 h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => void generateBriefing()}
                    disabled={generatingBriefing}
                  >
                    <RefreshCw className={cn("h-3 w-3 mr-1.5", generatingBriefing && "animate-spin")} />
                    Refresh
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Athena AI</h2>
                    <p className="text-muted-foreground max-w-md mt-2 text-sm">
                      Your personal marketing strategist. I analyze campaigns, find opportunities, and help you make data-driven decisions.
                    </p>
                  </div>
                  {briefing === null && (
                    <Button
                      onClick={() => void generateBriefing()}
                      disabled={generatingBriefing}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      {generatingBriefing
                        ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Generating briefing…</>
                        : <><Sparkles className="h-3.5 w-3.5" />Generate Today's Briefing</>
                      }
                    </Button>
                  )}
                </div>
              )}

              {/* Windsor CTA if no data */}
              {briefing?.content?.includes("Windsor.ai") && (
                <div className="w-full p-4 rounded-xl border border-border/50 bg-muted/30 flex items-center gap-3">
                  <Database className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Connect Windsor.ai</p>
                    <p className="text-xs text-muted-foreground">Sync your ad data for real insights</p>
                  </div>
                  <Link href="/windsor">
                    <Button size="sm" className="shrink-0 text-xs h-7">Connect</Button>
                  </Link>
                </div>
              )}

              {/* Suggested Prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                {prompts?.map((prompt) => (
                  <Button
                    key={prompt.id}
                    variant="outline"
                    className="h-auto p-3.5 justify-start text-left whitespace-normal border-border/50 hover:border-primary/50 hover:bg-primary/5"
                    onClick={() => setInput(prompt.text)}
                  >
                    <span className="text-xs leading-relaxed">{prompt.text}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5 max-w-3xl mx-auto pb-4">
              {isLoadingMessages ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "flex-row-reverse" : ""}`}>
                      <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                      <Skeleton className={`h-16 rounded-2xl ${i % 2 === 0 ? "w-2/3" : "w-4/5"}`} />
                    </div>
                  ))}
                </div>
              ) : (
                messages?.map((msg) => (
                  <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                    <div className={cn(
                      "h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-1",
                      msg.role === "user"
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/20 text-primary border border-primary/30"
                    )}>
                      {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                    </div>
                    <div className={cn(
                      "px-4 py-3 rounded-2xl text-sm shadow-sm max-w-[85%]",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-card border border-border/50 rounded-tl-sm text-card-foreground"
                    )}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
              {sendMessage.isPending && (
                <div className="flex gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-card border border-border/50 flex items-center gap-1.5">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 md:p-4 bg-background/50 backdrop-blur border-t border-border/50">
          <div className="max-w-3xl mx-auto relative flex items-end">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Athena about your campaigns, ROAS, budget allocation…"
              className="pr-12 bg-card border-border shadow-sm rounded-xl text-sm"
              disabled={sendMessage.isPending}
            />
            <Button
              size="icon"
              className="absolute right-1 bottom-1 h-8 w-8 rounded-lg"
              onClick={() => void handleSend()}
              disabled={!input.trim() || sendMessage.isPending}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-center mt-1.5 text-[10px] text-muted-foreground">
            Athena can make mistakes. Verify important metrics.
          </p>
        </div>
      </Card>
    </div>
  );
}
