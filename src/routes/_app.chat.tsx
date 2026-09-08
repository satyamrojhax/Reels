import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Send, Image as ImageIcon, X, Bot, PlusCircle, Settings2, History, Trash2, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { getChatSessions, saveChatSession, deleteChatSession, type ChatMessage, getChatInstruction, setChatInstruction, type ChatSession } from "@/lib/storage";

export const Route = createFileRoute("/_app/chat")({
  component: ChatPage,
});

type Message = {
  role: "user" | "model";
  content: string;
  image?: string | null;
};

const INITIAL_MESSAGE: Message = { role: "model", content: "Hi! How can I help you today?" };

function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => getChatSessions());
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    const existing = getChatSessions();
    if (existing.length > 0) return existing[0].id;
    return Date.now().toString();
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    const existing = getChatSessions();
    if (existing.length > 0 && Array.isArray(existing[0].messages)) return existing[0].messages;
    return [INITIAL_MESSAGE];
  });

  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [instruction, setInstruction] = useState(() => getChatInstruction());
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    const session: ChatSession = {
        id: currentSessionId,
        title: messages.length > 1 ? messages[1].content.slice(0, 30) + "..." : "New Chat",
        messages,
        updatedAt: Date.now()
    };
    saveChatSession(session);
    setSessions(getChatSessions());
  }, [messages, currentSessionId]);

  const handleNewChat = () => {
    const newId = Date.now().toString();
    setCurrentSessionId(newId);
    setMessages([INITIAL_MESSAGE]);
    setImage(null);
    setInput("");
    setShowHistory(false);
  };

  const loadSession = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session) {
      setCurrentSessionId(session.id);
      setMessages(session.messages);
      setShowHistory(false);
    }
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteChatSession(id);
    const updatedSessions = getChatSessions();
    setSessions(updatedSessions);
    if (currentSessionId === id) {
      if (updatedSessions.length > 0) {
        loadSession(updatedSessions[0].id);
      } else {
        handleNewChat();
      }
    }
  };

  const handleSaveInstruction = () => {
    setChatInstruction(instruction);
    setShowSettings(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !image) || isLoading) return;

    const newMessage: Message = { role: "user", content: input.trim(), image };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setImage(null);
    setIsLoading(true);

    try {
      let payloadImage = null;
      if (newMessage.image) {
        const parts = newMessage.image.split(',');
        const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        payloadImage = {
          data: parts[1] || parts[0],
          mimeType: mimeType,
          previewUrl: newMessage.image
        };
      }
      
      const payload = {
        messages: messages.concat(newMessage).map(m => ({ role: m.role, content: m.content })),
        image: payloadImage,
        system_instruction: instruction 
      };

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "accept": "*/*"
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let replyText = "Sorry, I couldn't understand the response.";
      
      if (response.ok) {
        try {
            const data = JSON.parse(responseText);
            replyText = data.reply || data.response || data.content || (data.message && data.message.content) || data.text || (typeof data === 'string' ? data : JSON.stringify(data));
        } catch (e) {
            replyText = responseText;
        }
      } else {
        replyText = `Error: ${response.status} - ${responseText}`;
      }
      
      setMessages((prev) => [...prev, { role: "model", content: replyText }]);
    } catch (error: any) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "model", content: `Oops, something went wrong while connecting to the AI: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)] md:h-[100dvh] bg-background relative">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md p-4 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent flex items-center gap-2">
          <Bot className="w-6 h-6 text-purple-500" />
          Naughty Girl
        </h1>
        <div className="flex items-center gap-1 sm:gap-2">
          <button 
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-muted"
          >
              <History className="w-5 h-5" />
          </button>
          <button 
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-muted"
          >
              <Settings2 className="w-5 h-5" />
          </button>
          <button 
              onClick={handleNewChat}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full hover:bg-muted"
          >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </header>

      {showHistory && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md max-h-[80vh] flex flex-col rounded-2xl shadow-xl border p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <History className="w-5 h-5" />
                Chat History
              </h2>
              <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-muted rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {sessions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No chats yet</p>
              ) : (
                sessions.map((session) => (
                  <div 
                    key={session.id}
                    onClick={() => loadSession(session.id)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${currentSessionId === session.id ? 'bg-primary/10 border-primary/20 border' : 'hover:bg-muted border border-transparent'}`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <MessageSquare className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <div className="truncate">
                        <p className="text-sm font-medium truncate">{session.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(session.updatedAt).toLocaleDateString()} • {Array.isArray(session.messages) ? session.messages.length : 0} msgs
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleDeleteSession(e, session.id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                AI Instructions
              </h2>
              <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-muted rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure how the AI should behave. You can give it a persona, tell it how to format responses, or set constraints.
            </p>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              className="w-full h-32 p-3 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              placeholder="e.g. You are a helpful assistant..."
            />
            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 rounded-xl hover:bg-muted text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveInstruction}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
        {Array.isArray(messages) && messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "model" && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-md">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border rounded-tl-sm text-card-foreground"}`}>
              {msg.image && (
                <img src={msg.image} alt="Uploaded" className="max-w-full rounded-xl mb-3 border bg-black/5" />
              )}
              {msg.content && (
                <div className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">
                  <ReactMarkdown 
                    components={{
                      strong: ({node, ...props}) => <span className="font-bold" {...props} />,
                      em: ({node, ...props}) => <span className="italic" {...props} />,
                      p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
                      li: ({node, ...props}) => <li {...props} />,
                      h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-2" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-2" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-base font-bold mb-2" {...props} />,
                      code: ({node, ...props}) => <code className="bg-black/10 dark:bg-white/10 rounded px-1.5 py-0.5 text-sm font-mono" {...props} />,
                      pre: ({node, ...props}) => <pre className="bg-black/10 dark:bg-white/10 rounded p-3 mb-2 overflow-x-auto text-sm font-mono" {...props} />
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-md">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-card border rounded-2xl rounded-tl-sm p-4 flex gap-1.5 items-center shadow-sm">
              <div className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-10">
        <div className="max-w-3xl mx-auto">
            {image && (
            <div className="relative inline-block mb-3 ml-2 group animate-in fade-in slide-in-from-bottom-2">
                <img src={image} alt="Preview" className="h-24 w-24 rounded-xl border-2 border-primary/20 object-cover shadow-md" />
                <button
                onClick={() => setImage(null)}
                className="absolute -top-2 -right-2 bg-foreground text-background rounded-full p-1 shadow-lg hover:scale-110 transition-transform"
                >
                <X className="w-4 h-4" />
                </button>
            </div>
            )}
            <div className="flex items-end gap-2 bg-card border rounded-3xl p-2 shadow-lg ring-1 ring-black/5">
            <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageUpload}
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-full hover:bg-muted text-muted-foreground transition-colors shrink-0"
            >
                <ImageIcon className="w-6 h-6" />
            </button>
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                    }
                }}
                placeholder="Ask anything..."
                className="w-full bg-transparent p-3 max-h-32 min-h-[48px] resize-none focus:outline-none text-[15px]"
                rows={1}
            />
            <button
                onClick={handleSend}
                disabled={(!input.trim() && !image) || isLoading}
                className="p-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-all shrink-0 m-0.5 shadow-sm"
            >
                <Send className="w-5 h-5 ml-0.5" />
            </button>
            </div>
        </div>
      </div>
    </div>
  );
}
