import React, { useState } from "react";
import { useChat } from "../../store/chatContext";
import { api } from "../../services/api";
import { X, Users, Radio, User, Plus, Lock, Globe } from "lucide-react";

export const NewChatModal: React.FC = () => {
  const { showNewChatModal, setShowNewChatModal, currentUser, refreshChats, systemSettings } = useChat();

  const [type, setType] = useState<"direct" | "group" | "channel">("group");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [username, setUsername] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!showNewChatModal) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !currentUser) return;

    setIsLoading(true);
    try {
      await api.createChat({
        type,
        title,
        description,
        username: username || undefined,
        isPrivate,
        ownerId: currentUser.id,
      });
      await refreshChats();
      setShowNewChatModal(false);
      setTitle("");
      setDescription("");
      setUsername("");
    } catch (err: any) {
      alert(err.message || "خطا در ایجاد گفتگو");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1A1D2B] border border-white/10 rounded-3xl p-6 w-full max-w-md text-white shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-3">
          <h3 className="font-bold text-sm text-slate-100">ایجاد گفت‌وگوی جدید</h3>
          <button
            onClick={() => setShowNewChatModal(false)}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          {/* Type Selector */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setType("direct")}
              className={`p-3 rounded-2xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                type === "direct"
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                  : "bg-white/5 border-white/5 text-slate-400 hover:text-slate-200"
              }`}
            >
              <User className="w-5 h-5" />
              <span>چت خصوصی</span>
            </button>

            {systemSettings.groupsEnabled && (
              <button
                type="button"
                onClick={() => setType("group")}
                className={`p-3 rounded-2xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                  type === "group"
                    ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                    : "bg-white/5 border-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Users className="w-5 h-5" />
                <span>ساخت گروه</span>
              </button>
            )}

            {systemSettings.channelsEnabled && (
              <button
                type="button"
                onClick={() => setType("channel")}
                className={`p-3 rounded-2xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                  type === "channel"
                    ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                    : "bg-white/5 border-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Radio className="w-5 h-5" />
                <span>ساخت کانال</span>
              </button>
            )}
          </div>

          {/* Form Fields */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              عنوان {type === "group" ? "گروه" : type === "channel" ? "کانال" : "گفتگو"}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثلاً: گروه توسعه فرانت‌اند"
              className="w-full bg-[#141724] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          {(type === "group" || type === "channel") && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">نام کاربری عمومی (آیدی)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-mono text-blue-400">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="my_awesome_channel"
                    className="w-full bg-[#141724] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-100 font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">توضیحات بیوگرافی</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="موضوع و قوانین این گفتگو..."
                  rows={2}
                  className="w-full bg-[#141724] border border-white/10 rounded-xl p-3 text-xs text-slate-100 focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#141724] border border-white/5">
                <span className="text-xs font-medium text-slate-200 flex items-center gap-2">
                  {isPrivate ? <Lock className="w-4 h-4 text-amber-400" /> : <Globe className="w-4 h-4 text-emerald-400" />}
                  <span>{isPrivate ? "گفتگوی خصوصی (فقط با لینک دعوت)" : "گفتگوی عمومی (قابل جستجو)"}</span>
                </span>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-4 h-4 accent-blue-500 rounded"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={() => setShowNewChatModal(false)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {isLoading ? "در حال ایجاد..." : "ایجاد گفتگو"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
