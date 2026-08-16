// web/src/components/modals/MessageMenuModal.tsx

import React from "react";
import {
     Reply,
     Edit2,
     Trash2,
     Pin,
     Share2,
} from "lucide-react";
import { Message } from "../../types";

interface MessageMenuModalProps {
     isOpen: boolean;
     onClose: () => void;
     message: Message;
     isMe: boolean;
     onReply: () => void;
     onForward: () => void;
     onEdit: () => void;
     onPin: () => void;
     onDelete: () => void;
     systemSettings: any;
}

export const MessageMenuModal: React.FC<MessageMenuModalProps> = ({
     isOpen,
     onClose,
     message,
     isMe,
     onReply,
     onForward,
     onEdit,
     onPin,
     onDelete,
     systemSettings,
}) => {
     if (!isOpen) return null;

     return (
          <div className="absolute top-8 z-30 bg-[var(--sidebar)] border border-[var(--border)] shadow-2xl rounded-2xl py-1.5 w-40 text-xs text-[var(--text-primary)] font-medium">
               {systemSettings.replyEnabled && (
                    <button
                         onClick={() => {
                              onReply();
                              onClose();
                         }}
                         className="w-full text-right px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
                    >
                         <Reply className="w-3.5 h-3.5 text-blue-500" />
                         <span>پاسخ</span>
                    </button>
               )}

               {systemSettings.forwardEnabled && (
                    <button
                         onClick={() => {
                              onForward();
                              onClose();
                         }}
                         className="w-full text-right px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 text-emerald-500 hover:text-emerald-400"
                    >
                         <Share2 className="w-3.5 h-3.5" />
                         <span>هدایت</span>
                    </button>
               )}

               {isMe && systemSettings.editMessageEnabled && (
                    <button
                         onClick={() => {
                              onEdit();
                              onClose();
                         }}
                         className="w-full text-right px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
                    >
                         <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                         <span>ویرایش پیام</span>
                    </button>
               )}

               {systemSettings.pinEnabled && (
                    <button
                         onClick={() => {
                              onPin();
                              onClose();
                         }}
                         className="w-full text-right px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
                    >
                         <Pin className="w-3.5 h-3.5 text-amber-500" />
                         <span>{message.isPinned ? "برداشتن پین" : "پین کردن"}</span>
                    </button>
               )}

               {isMe && systemSettings.deleteMessageEnabled && (
                    <button
                         onClick={() => {
                              onDelete();
                              onClose();
                         }}
                         className="w-full text-right px-3 py-2 hover:bg-rose-500/20 text-rose-500 flex items-center gap-2"
                    >
                         <Trash2 className="w-3.5 h-3.5" />
                         <span>حذف پیام</span>
                    </button>
               )}
          </div>
     );
};