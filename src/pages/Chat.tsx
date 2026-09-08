import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api, CitedEntry } from "@/lib/api";

interface ChatMessageUI {
  sender: "user" | "ai";
  text: string;
  citations?: CitedEntry[];
}

const Chat = () => {
  const { token } = useAuth();
  const [messages, setMessages] = useState<ChatMessageUI[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    api
      .getChatHistory(token)
      .then((history) =>
        setMessages(
          history.map((m) => ({
            sender: m.role === "user" ? "user" : "ai",
            text: m.content,
            citations: m.cited_entries,
          }))
        )
      )
      .catch((error) => console.error("Error loading chat history:", error));
  }, [token]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !token) return;

    const userMessage: ChatMessageUI = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      const data = await api.sendChatMessage(token, userMessage.text);
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: data.response, citations: data.cited_entries },
      ]);
    } catch (error) {
      console.error("Error communicating with AI:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Sorry, there was an issue connecting to the AI. Please try again later.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container mx-auto px-4 pt-24 min-h-screen bg-cream">
      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-8rem)]">
        <div className="col-span-12">
          <Card className="h-full bg-white/50 backdrop-blur-sm flex flex-col">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex flex-col ${
                      message.sender === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.sender === "user"
                          ? "bg-deep-red text-white"
                          : "bg-beige text-brown"
                      }`}
                    >
                      {message.text}
                    </div>
                    {message.citations && message.citations.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1 max-w-[70%]">
                        {message.citations.map((c) => (
                          <Link
                            key={c.entry_id}
                            to="/diary"
                            title={new Date(c.date).toLocaleDateString()}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-white/70 text-brown/80 border border-beige hover:bg-beige/40 transition-colors"
                          >
                            <BookOpen className="h-3 w-3" />
                            {c.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t bg-white/30">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1"
                  disabled={sending}
                />
                <Button
                  type="submit"
                  disabled={sending}
                  className="bg-deep-red hover:bg-brown"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Chat;
