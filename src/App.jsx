import { useEffect, useRef, useState } from "react";
import { extractPdfText } from "./pdf";

const STORAGE_KEY = "cf-ai-chat";

export default function App() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // MOBILE SIDEBAR
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // AUTO SCROLL
  const bottomRef = useRef(null);

  // ===============================
  // LOAD STORAGE
  // ===============================
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setChats(parsed.chats || []);
      setActiveChatId(parsed.activeChatId || null);
    } else {
      const firstChat = {
        id: crypto.randomUUID(),
        title: "New Chat",
        messages: [],
        pdfText: "",
        pdfName: "",
      };
      setChats([firstChat]);
      setActiveChatId(firstChat.id);
    }
  }, []);

  // ===============================
  // SAVE STORAGE
  // ===============================
  useEffect(() => {
    if (chats.length === 0) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ chats, activeChatId })
    );
  }, [chats, activeChatId]);

  const activeChat = chats.find((c) => c.id === activeChatId);

  // ===============================
  // AUTO SCROLL ON MESSAGE
  // ===============================
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, loading]);

  // ===============================
  // CHAT CONTROL
  // ===============================
  const createNewChat = () => {
    const newChat = {
      id: crypto.randomUUID(),
      title: "New Chat",
      messages: [],
      pdfText: "",
      pdfName: "",
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setSidebarOpen(false);
  };

  const deleteChat = (id) => {
    const filtered = chats.filter((c) => c.id !== id);
    if (filtered.length === 0) return;
    setChats(filtered);
    setActiveChatId(filtered[0].id);
  };

  const clearAllChats = () => {
    if (!confirm("Hapus semua chat?")) return;
    localStorage.removeItem(STORAGE_KEY);
    const freshChat = {
      id: crypto.randomUUID(),
      title: "New Chat",
      messages: [],
      pdfText: "",
      pdfName: "",
    };
    setChats([freshChat]);
    setActiveChatId(freshChat.id);
  };

  // ===============================
  // PDF
  // ===============================
  const uploadPdf = async (file) => {
    if (!file || !activeChatId) return;
    setUploading(true);
    try {
      const text = await extractPdfText(file);
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === activeChatId
            ? {
                ...chat,
                pdfText: text,
                pdfName: file.name,
                messages: [
                  ...chat.messages,
                  {
                    role: "assistant",
                    content: `📄 PDF "${file.name}" berhasil dibaca.`,
                  },
                ],
              }
            : chat
        )
      );
    } finally {
      setUploading(false);
    }
  };

  // ===============================
  // SEND MESSAGE
  // ===============================
  const sendMessage = async () => {
    if (!input.trim() || !activeChat) return;

    const userMessage = { role: "user", content: input };
    const updatedMessages = [...activeChat.messages, userMessage];

    const isFirstMessage = !activeChat.messages.some(
      (m) => m.role === "user"
    );

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChatId
          ? { ...chat, messages: updatedMessages }
          : chat
      )
    );

    setInput("");
    setLoading(true);

    try {
      const res = await fetch(
        "https://chatbot.ttik73704.workers.dev/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages,
            pdfText: activeChat.pdfText,
            isFirstMessage,
          }),
        }
      );

      const data = await res.json();

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === activeChatId
            ? {
                ...chat,
                title:
                  isFirstMessage && data.title
                    ? data.title
                    : chat.title,
                messages: [
                  ...chat.messages,
                  {
                    role: "assistant",
                    content: data.reply,
                  },
                ],
              }
            : chat
        )
      );
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // RENDER
  // ===============================
  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* ================= SIDEBAR ================= */}
      <aside
        className={`
          bg-gray-900 text-white w-64 p-4 flex flex-col gap-3
          fixed inset-y-0 left-0 z-40
          transform transition-transform
          md:static md:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <button
          className="md:hidden text-right mb-2"
          onClick={() => setSidebarOpen(false)}
        >
          ❌
        </button>

        <button
          onClick={createNewChat}
          className="bg-gray-700 p-2 rounded"
        >
          + New Chat
        </button>

        <button
          onClick={clearAllChats}
          className="bg-red-600 p-2 rounded text-sm"
        >
          Clear All Chats
        </button>

        <div className="flex-1 overflow-y-auto space-y-1">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`flex items-center p-2 rounded ${
                chat.id === activeChatId
                  ? "bg-gray-700"
                  : "hover:bg-gray-800"
              }`}
            >
              <div
                className="flex-1 truncate cursor-pointer"
                onClick={() => {
                  setActiveChatId(chat.id);
                  setSidebarOpen(false);
                }}
              >
                {chat.title}
              </div>

              <button
                onClick={() => deleteChat(chat.id)}
                className="ml-2"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* ================= CHAT AREA ================= */}
      <main className="flex-1 flex flex-col">
        {/* MOBILE HEADER */}
        <div className="md:hidden flex items-center gap-3 p-3 bg-gray-900 text-white">
          <button onClick={() => setSidebarOpen(true)}>☰</button>
          <span className="font-semibold truncate">
            {activeChat?.title}
          </span>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 p-4 overflow-y-auto overflow-x-hidden space-y-4 box-border">
          {activeChat?.messages.map((msg, i) => (
            <div
              key={i}
              className={`max-w-full sm:max-w-xl break-words ${
                msg.role === "user"
                  ? "ml-auto text-right"
                  : ""
              }`}
            >
              <div
                className={`inline-block px-4 py-2 rounded ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white border"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="text-sm text-gray-500">
              AI sedang mengetik...
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* INPUT */}
        <div className="border-t bg-white p-4 flex gap-2 items-center">
          <label className="cursor-pointer">
            📎
            <input
              type="file"
              accept="application/pdf"
              hidden
              onChange={(e) =>
                uploadPdf(e.target.files[0])
              }
            />
          </label>

          <input
            className="flex-1 border rounded px-4 py-2"
            value={input}
            onChange={(e) =>
              setInput(e.target.value)
            }
            onKeyDown={(e) =>
              e.key === "Enter" && sendMessage()
            }
            placeholder={
              activeChat?.pdfName
                ? `Tanya tentang ${activeChat.pdfName}...`
                : "Type a message..."
            }
          />

          <button
            onClick={sendMessage}
            className="bg-blue-600 text-white px-4 rounded"
          >
            Send
          </button>
        </div>

        {uploading && (
          <div className="text-center text-sm text-gray-500 pb-2">
            Membaca PDF...
          </div>
        )}
      </main>
    </div>
  );
}
