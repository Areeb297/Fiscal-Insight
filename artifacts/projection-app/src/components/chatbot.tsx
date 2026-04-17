import { useState, useRef, useEffect, useMemo } from "react";
import DOMPurify from "dompurify";
import { MessageSquare, X, Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSendChatMessage } from "@workspace/api-client-react";

type Message = {
  role: "user" | "assistant";
  content: string;
  html?: string;
};

const ALLOWED_TAGS = [
  "p", "strong", "em", "ul", "ol", "li", "h3", "h4",
  "table", "thead", "tbody", "tr", "th", "td",
  "code", "pre", "br", "hr", "blockquote", "a",
];
const ALLOWED_ATTR = ["href", "title", "target", "rel"];

const SUGGESTIONS = [
  "Summarize the projection",
  "Which employee costs the most per year?",
  "What's our break-even number of clients?",
  "How does margin change if I cut overheads 20%?",
];

function AssistantMessage({ html, content }: { html?: string; content: string }) {
  const safeHtml = useMemo(() => {
    if (!html) return null;
    return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
  }, [html]);

  if (safeHtml) {
    return (
      <div
        className="chat-prose text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    );
  }
  return <div className="text-sm whitespace-pre-wrap">{content}</div>;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello — I can help you analyze your projection data, walk through the math, and answer 'what if' questions. What would you like to know?",
      html: "<p>Hello — I can help you analyze your projection data, walk through the math, and answer <em>what if</em> questions.</p><p>Try asking about employee costs, margins, overheads, or per-client economics.</p>",
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMessage = useSendChatMessage();

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      const target = viewport ?? scrollRef.current;
      target.scrollTop = target.scrollHeight;
    }
  }, [messages, sendMessage.isPending]);

  const submitMessage = (text: string) => {
    const userMessage = text.trim();
    if (!userMessage || sendMessage.isPending) return;
    setInput("");

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    sendMessage.mutate(
      { data: { message: userMessage, history } },
      {
        onSuccess: (response) => {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: response.reply, html: response.replyHtml },
          ]);
        },
        onError: () => {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Sorry, I encountered an error processing your request.",
              html: "<p>Sorry, I encountered an error processing your request.</p>",
            },
          ]);
        },
      },
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage(input);
  };

  return (
    <>
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg p-0 z-50"
        onClick={() => setIsOpen(true)}
        data-testid="button-open-chat"
        aria-label="Open assistant"
      >
        <MessageSquare className="h-6 w-6 text-primary-foreground" />
      </Button>

      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-[480px] bg-card border-l shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <CardHeader className="border-b px-4 py-3 flex flex-row items-center justify-between sticky top-0 bg-card z-10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold leading-tight">Projection Assistant</CardTitle>
              <div className="text-xs text-muted-foreground">Ask about your data</div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="space-y-4 p-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[90%] rounded-lg px-3 py-2 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none text-sm"
                      : "bg-muted text-foreground rounded-bl-none"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <AssistantMessage html={msg.html} content={msg.content} />
                  ) : (
                    <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
              </div>
            ))}
            {sendMessage.isPending && (
              <div className="flex justify-start">
                <div className="bg-muted text-foreground rounded-lg rounded-bl-none px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            {messages.length === 1 && !sendMessage.isPending && (
              <div className="pt-2 space-y-2">
                <div className="text-xs text-muted-foreground px-1">Suggestions</div>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => submitMessage(s)}
                      className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted transition-colors text-left"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <CardFooter className="border-t p-3 shrink-0 bg-card">
          <form onSubmit={handleSubmit} className="flex w-full gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about projections, margins, costs..."
              className="flex-1"
              disabled={sendMessage.isPending}
            />
            <Button type="submit" size="icon" disabled={sendMessage.isPending || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardFooter>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
