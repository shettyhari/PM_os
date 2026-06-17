import { useState, useRef, useEffect } from "react";
import { useListConversations, useGetSuggestedPrompts, useSendMessage, useCreateConversation, useGetConversationMessages } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, Plus, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function Athena() {
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { data: conversations, isLoading: isLoadingChats } = useListConversations();
  const { data: prompts } = useGetSuggestedPrompts();
  const { data: messages, isLoading: isLoadingMessages } = useGetConversationMessages(activeChatId!, { query: { enabled: !!activeChatId } });
  
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
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-4">
      {/* Sidebar */}
      <Card className="w-full md:w-64 lg:w-80 flex flex-col h-full shrink-0 border-border/50 bg-sidebar/30 backdrop-blur-md">
        <div className="p-4 border-b border-border/50">
          <Button 
            className="w-full justify-start gap-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
            onClick={() => setActiveChatId(null)}
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1 px-3 py-2">
          {isLoadingChats ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ) : conversations?.map(chat => (
            <Button
              key={chat.id}
              variant={activeChatId === chat.id ? "secondary" : "ghost"}
              className="w-full justify-start font-normal mb-1 h-10 px-3 truncate"
              onClick={() => setActiveChatId(chat.id)}
            >
              <span className="truncate">{chat.title}</span>
            </Button>
          ))}
        </ScrollArea>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col h-full border-border/50 relative overflow-hidden bg-card/50">
        <div className="flex-1 overflow-y-auto p-4 md:p-6" ref={scrollRef}>
          {!activeChatId || (messages?.length === 0 && !isLoadingMessages) ? (
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto space-y-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-glow">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Athena AI</h2>
                <p className="text-muted-foreground max-w-md">
                  I can analyze your campaigns, predict performance, and find opportunities across all your marketing channels.
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {prompts?.map(prompt => (
                  <Button
                    key={prompt.id}
                    variant="outline"
                    className="h-auto p-4 justify-start text-left whitespace-normal border-border/50 hover:border-primary/50 hover:bg-primary/5"
                    onClick={() => {
                      setInput(prompt.text);
                    }}
                  >
                    <span className="text-sm">{prompt.text}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto pb-4">
              {isLoadingMessages ? (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <Skeleton className="h-20 w-full max-w-[80%] rounded-2xl" />
                  </div>
                  <div className="flex gap-4 flex-row-reverse">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <Skeleton className="h-12 w-full max-w-[60%] rounded-2xl" />
                  </div>
                </div>
              ) : messages?.map(msg => (
                <div 
                  key={msg.id} 
                  className={cn(
                    "flex gap-4",
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-1",
                    msg.role === "user" ? "bg-muted text-muted-foreground" : "bg-primary/20 text-primary border border-primary/30"
                  )}>
                    {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={cn(
                    "px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap shadow-sm",
                    msg.role === "user" 
                      ? "bg-primary text-primary-foreground rounded-tr-sm" 
                      : "bg-card border border-border/50 rounded-tl-sm text-card-foreground"
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {sendMessage.isPending && (
                <div className="flex gap-4">
                  <div className="h-8 w-8 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-card border border-border/50 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 bg-background/50 backdrop-blur border-t border-border/50">
          <div className="max-w-3xl mx-auto relative flex items-end">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Athena to analyze campaigns..."
              className="pr-12 bg-card border-border shadow-sm rounded-xl"
              disabled={sendMessage.isPending}
            />
            <Button 
              size="icon" 
              className="absolute right-1 bottom-1 h-8 w-8 rounded-lg transition-transform hover:scale-105"
              onClick={handleSend}
              disabled={!input.trim() || sendMessage.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-center mt-2">
            <span className="text-[10px] text-muted-foreground">Athena AI can make mistakes. Verify important metrics.</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
