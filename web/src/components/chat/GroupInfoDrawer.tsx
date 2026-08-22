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
import { ShowImage } from "@/src/utils/showImage";
import { BaseDomain } from "@/src/types";

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
      <div className="w-full max-w-sm bg-[var(--bg)] border-r border-white/5 h-full overflow-y-auto p-5 text-white flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-300">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/5">
            <h3 className="font-bold text-sm text-[var(--text-primary)]">اطلاعات گفتگو</h3>
            <button
              onClick={() => setShowGroupDrawer(false)}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Profile Card */}
          <div className="text-center mb-6">
            <ShowImage src={activeChat.avatarUrl} className="w-20 h-20 mx-auto rounded-full object-cover ring-4 ring-cyan-500/20 mb-3 shadow-xl" />
            <h2 className="font-bold text-base text-[var(--text-primary)]/70">{activeChat.title}</h2>
            {activeChat.description &&
              <p className="text-xs text-slate-400 mt-2 leading-relaxed px-2">
                {activeChat.description}
              </p>
            }
          </div>

          {/* Members List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Users className="w-6 h-6 text-cyan-400" />
                <span className="text-[var(--text-primary)]/60 mt-3">اعضای گروه ({actualMemberCount})</span>
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {activeChat.members.map((m) => (
                <div
                  key={m.userId}
                  className="flex items-center justify-between p-2 rounded-xl border border-[var(--border)]"
                >
                  <div className="flex items-center gap-2">
                    {/* <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center">
                      {String(m.userId).substring(0, 2).toUpperCase()}
                    </div> */}
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-primary)]">
                        {String(m.userId) === String(currentUser?.id) ? "شما" : m.userDisplayname}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mute & Leave Actions */}
        <div className="pt-4 border-t border-[var(--border)] space-y-2">
          <button
            onClick={() => setShowGroupDrawer(false)}
            className="w-full py-2.5 rounded-xl bg-[var(--border)] hover:bg-[var(--border)]/60 text-[var(--text-primary)]/60 font-bold text-xs transition-colors"
          >
            بستن کشو
          </button>
        </div>
      </div>
    </div>
  );
};
