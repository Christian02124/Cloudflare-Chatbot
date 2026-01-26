console.log("APP VERSION 2026-01-26 FIX GRID");
import { useEffect, useState } from "react";
import { extractPdfText } from "./pdf";

const STORAGE_KEY = "cf-ai-chat";

export default function App() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
  // NEW CHAT
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

  // ===============================
  // DELETE CHAT
  // ===============================
  const deleteChat = (id) => {
    const filtered = chats.filter((c) => c.id !== id);
    if (filtered.length === 0) return;
    setChats(filtered);
    setActiveChatId(filtered[0].id);
    setSidebarOpen(false);
  };

  // ===============================
  // CLEAR ALL
  // ===============================
  const clearAllChats = () => {
    if (!confirm("Hapus semua chat? Data tidak bisa dikembalikan.")) return;

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
    setSidebarOpen(false);
  };

  // ===============================
  // UPLOAD PDF
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
    } catch {
      alert("Gagal membaca PDF");
    } finally {
      setUploading(false);
    }
  };

  // ===============================
  // SEND MESSAGE (WORKER FORMAT BARU)
  // ===============================
  const sendMessage = async () => {
    if (!input.trim() || !activeChat) return;

    const userMessage = input;

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChatId
          ? {
              ...chat,
              messages: [...chat.messages, { role: "user", content: userMessage }],
            }
          : chat
      )
    );

    setInput("");
    setLoading(true);

    try {
      const res = await fetch("https://chatbot.ttik73704.workers.dev/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...activeChat.messages, { role: "user", content: userMessage }],
          pdfText: activeChat.pdfText || "",
          isFirstMessage: activeChat.messages.length === 0,
        }),
      });

      if (!res.ok) throw new Error("Request failed");

      const data = await res.json();

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === activeChatId
            ? {
                ...chat,
                title: data.title || chat.title,
                messages: [
                  ...chat.messages,
                  { role: "assistant", content: data.reply },
                ],
              }
            : chat
        )
      );
    } catch {
      alert("⚠️ Gagal menghubungi AI");
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // RENDER
  // ===============================
  return (
    <div className="min-h-screen flex bg-gray-100 overflow-hidden">
      {/* SIDEBAR */}
      <aside
        className={`
          fixed md:static z-20
          h-full w-64
          bg-gray-900 text-white p-4
          flex flex-col gap-3
          transform transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        <button
          onClick={createNewChat}
          className="bg-gray-700 hover:bg-gray-600 p-2 rounded"
        >
          + New Chat
        </button>

        <button
          onClick={clearAllChats}
          className="bg-red-600 hover:bg-red-500 p-2 rounded text-sm"
        >
          Clear All Chats
        </button>

        <div className="flex-1 overflow-y-auto space-y-1">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => {
                setActiveChatId(chat.id);
                setSidebarOpen(false);
              }}
              className={`flex justify-between items-center p-2 rounded cursor-pointer ${
                chat.id === activeChatId
                  ? "bg-gray-700"
                  : "hover:bg-gray-800"
              }`}
            >
              <span className="truncate">{chat.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChat(chat.id);
                }}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* CHAT AREA (GRID FIX MOBILE) */}
      <main
        className="
          flex-1
          grid
          grid-rows-[auto,1fr,auto]
          h-screen
          md:h-auto
        "
        onClick={() => setSidebarOpen(false)}
      >
        {/* MOBILE HEADER */}
        <div className="md:hidden flex items-center gap-2 p-3 bg-gray-900 text-white">
          <button onClick={() => setSidebarOpen(true)}>☰</button>
          <span className="font-semibold truncate">
            {activeChat?.title || "Chat"}
          </span>
        </div>

        {/* MESSAGES */}
        <div className="overflow-y-auto p-4 space-y-4">
          {activeChat?.messages.map((msg, i) => (
            <div
              key={i}
              className={`max-w-xl ${
                msg.role === "user" ? "ml-auto text-right" : ""
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
        </div>

        {/* INPUT */}
        <div className="border-t bg-white p-3 flex gap-2 items-center">
          <label className="cursor-pointer">
            📎
            <input
              type="file"
              accept="application/pdf"
              hidden
              onChange={(e) => uploadPdf(e.target.files[0])}
            />
          </label>

          <input
            className="flex-1 border rounded px-4 py-2"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
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
