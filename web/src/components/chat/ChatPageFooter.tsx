// web/src/components/ChatPane/ChatFooter.tsx

import React from "react";
import { Chat, User } from "../../types";
import { Lock } from "lucide-react";
import { MessageInput } from "./MessageInput";

interface ChatFooterProps {
     activeChat: Chat;
     currentUser: User | null;
}

export const ChatPageFooter: React.FC<ChatFooterProps> = ({ activeChat, currentUser }) => {
     const isChannel = activeChat.type === "channel";
     const userChannelMember = activeChat.members?.find((m) => String(m.userId) === String(currentUser?.id));
     const isChannelAdmin =
          isChannel &&
          (String(activeChat.ownerId) === String(currentUser?.id) ||
               userChannelMember?.role === "owner" ||
               userChannelMember?.role === "admin" ||
               currentUser?.role === "admin");

     if (isChannel && !isChannelAdmin) {
          return (
               <div className="p-4 bg-[var(--sidebar)] border-t border-[var(--border)] text-center text-xs font-semibold text-[var(--text-secondary)] flex items-center justify-center gap-2 select-none shrink-0 shadow-lg">
                    <Lock className="w-4 h-4 text-amber-500" />
                    <span>تنها مدیران کانال می‌توانند در این کانال پیام ارسال کنند.</span>
               </div>
          );
     }

     return <MessageInput />;
};