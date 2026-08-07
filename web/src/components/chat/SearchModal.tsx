import React, { useState, useEffect } from "react";
import { useChat } from "../../store/chatContext";
import { Search, X, MessageSquare, Calendar, User, ArrowLeft, Loader2 } from "lucide-react";

export const SearchModal: React.FC = () => {
  const {
    showSearchModal,
    setShowSearchModal,
    searchResults,
    isSearching,
    performSearch,
    jumpToMessage,
    activeChat,
  } = useChat();

  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showSearchModal) {
        setShowSearchModal(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showSearchModal, setShowSearchModal]);

  if (!showSearchModal || !activeChat) return null;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    performSearch(val);
  };

  const handleSelectResult = (messageId: string) => {
    jumpToMessage(messageId);
    setShowSearchModal(false);
  };

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString("fa-IR", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#181B28] border border-white/10 rounded-3xl p-5 max-w-lg w-full shadow-2xl text-white space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold">جستجو در گفتگو ({activeChat.title})</h3>
          </div>
          <button
            onClick={() => setShowSearchModal(false)}
            className="p-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Box */}
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={handleSearchChange}
            placeholder="کلمه یا متن مورد نظر را تایپ کنید..."
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pr-10 pl-10 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
          {isSearching ? (
            <Loader2 className="w-4 h-4 text-blue-400 absolute left-3.5 top-3.5 animate-spin" />
          ) : query ? (
            <button
              onClick={() => {
                setQuery("");
                performSearch("");
              }}
              className="absolute left-3.5 top-3.5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>

        {/* Search Results List */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar min-h-[160px]">
          {!query.trim() ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <span>برای شروع جستجو، متنی را وارد کنید</span>
            </div>
          ) : isSearching ? (
            <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span>در حال جستجو بین پیام‌ها...</span>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <p className="font-bold mb-1">نتیجه‌ای یافت نشد</p>
              <p className="text-[11px] text-slate-500">هیچ پیامی با عبارت «{query}» تطابق نداشت.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] text-slate-400 font-bold px-1">
                {searchResults.length} پیام پیدا شد:
              </p>
              {searchResults.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => handleSelectResult(String(msg.id))}
                  className="p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-blue-500/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="font-semibold text-blue-300 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{msg.senderName || "کاربر"}</span>
                    </span>
                    <span className="font-mono text-[10px]">{formatTime(msg.createdAt)}</span>
                  </div>
                  <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed font-sans">
                    {msg.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
