import React, { useState } from "react";
import { useChat } from "../../store/chatContext";
import {
  X,
  Users,
  Radio,
  User,
  ShieldAlert,
  Link,
  QrCode,
  BellOff,
  Bell,
  Trash2,
  UserPlus,
  Copy,
  Check,
  Sparkles
} from "lucide-react";

export const GroupInfoDrawer: React.FC = () => {
  const { showGroupDrawer, setShowGroupDrawer, activeChat, currentUser, systemSettings } = useChat();

  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  if (!showGroupDrawer || !activeChat) return null;

  const actualMemberCount = activeChat.members ? activeChat.members.length : (activeChat.memberCount || 0);

  const handleCopyInvite = () => {
    if (activeChat.inviteLink) {
      navigator.clipboard.writeText(activeChat.inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-sm bg-[#1A1D2B] border-r border-white/5 h-full overflow-y-auto p-5 text-white flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-300">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/5">
            <h3 className="font-bold text-sm text-slate-100">اطلاعات گفتگو</h3>
            <button
              onClick={() => setShowGroupDrawer(false)}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Profile Card */}
          <div className="text-center mb-6">
            <img
              src={activeChat.avatarUrl || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200"}
              alt={activeChat.title}
              className="w-20 h-20 mx-auto rounded-full object-cover ring-4 ring-blue-500/20 mb-3 shadow-xl"
            />
            <h2 className="font-bold text-base text-slate-100">{activeChat.title}</h2>
            {activeChat.username && (
              <p className="text-xs text-blue-400 font-mono mt-0.5">@{activeChat.username}</p>
            )}
            <p className="text-xs text-slate-400 mt-2 leading-relaxed px-2">
              {activeChat.description || "توضیحاتی برای این گفت‌وگو ثبت نشده است."}
            </p>
          </div>

          {/* Invite Link & QR Section for Groups/Channels */}
          {(activeChat.type === "group" || activeChat.type === "channel") && (
            <div className="bg-[#141724] border border-white/5 rounded-2xl p-3 mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Link className="w-4 h-4 text-blue-400" />
                  <span>لینک دعوت اختصاصی</span>
                </span>
                <button
                  onClick={() => setShowQr(!showQr)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300"
                  title="نمایش QR Code"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              </div>

              {showQr ? (
                <div className="bg-white p-3 rounded-xl text-center my-2">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(activeChat.inviteLink || "https://chat.app")}`}
                    alt="QR Code"
                    className="w-32 h-32 mx-auto"
                  />
                  <p className="text-[10px] text-slate-700 mt-1 font-mono">اسکن جهت ورود مستقیم</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-[#1A1D2B] p-2 rounded-xl border border-white/5 text-xs font-mono">
                  <span className="truncate flex-1 text-slate-400 text-[11px]">{activeChat.inviteLink}</span>
                  <button
                    onClick={handleCopyInvite}
                    className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-sans text-[11px] shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Members List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>اعضای گروه ({actualMemberCount})</span>
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {activeChat.members.map((m) => (
                <div
                  key={m.userId}
                  className="flex items-center justify-between p-2 rounded-xl bg-[#141724] border border-white/5"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center">
                      {m.userId.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">
                        {m.userId === currentUser?.id ? "شما" : `کاربر (${m.userId})`}
                      </p>
                      <span className="text-[10px] text-blue-400 font-mono">{m.role}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mute & Leave Actions */}
        <div className="pt-4 border-t border-white/5 space-y-2">
          <button
            onClick={() => setShowGroupDrawer(false)}
            className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold text-xs transition-colors"
          >
            بستن کشو
          </button>
        </div>
      </div>
    </div>
  );
};
