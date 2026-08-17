// web/src/components/modals/MessageMenuModal.tsx

import React, { useRef, useEffect, useState } from "react";
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
     anchorRef?: React.RefObject<HTMLButtonElement | null>;
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
     anchorRef,
}) => {
     const modalRef = useRef<HTMLDivElement>(null);
     const [position, setPosition] = useState({ top: 0, left: 0 });
     const [isPositioned, setIsPositioned] = useState(false);

     useEffect(() => {
          if (!isOpen || !anchorRef?.current) {
               setIsPositioned(false);
               return;
          }

          const updatePosition = () => {
               const anchor = anchorRef.current;
               if (!anchor) return;

               const rect = anchor.getBoundingClientRect();
               const modalWidth = 160; // عرض مودال (w-40 = 160px)
               const modalHeight = 220; // ارتفاع تقریبی

               // موقعیت‌یابی
               let top = rect.top - 10;
               let left = rect.left;

               // اگر ارتفاعش از پایین صفحه بیشتر میشد، بالا نشون بده
               if (top + modalHeight > window.innerHeight - 10) {
                    top = rect.top - modalHeight + 10;
               }

               // اگر بالا هم فضا نبود، وسط صفحه نشون بده
               if (top < 10) {
                    top = window.innerHeight / 2 - modalHeight / 2;
               }

               // تنظیم موقعیت افقی بر اساس isMe
               if (isMe) {
                    left = rect.right - modalWidth;
                    if (left < 10) left = 10;
               } else {
                    if (left + modalWidth > window.innerWidth - 10) {
                         left = window.innerWidth - modalWidth - 10;
                    }
                    if (left < 10) left = 10;
               }

               setPosition({ top, left });
               setIsPositioned(true);
          };

          requestAnimationFrame(() => {
               updatePosition();
          });

          window.addEventListener('resize', updatePosition);
          window.addEventListener('scroll', updatePosition, true);

          return () => {
               window.removeEventListener('resize', updatePosition);
               window.removeEventListener('scroll', updatePosition, true);
          };
     }, [isOpen, anchorRef, isMe]);

     if (!isOpen) return null;

     return (
          <div
               ref={modalRef}
               className={`fixed z-50 bg-[var(--sidebar)] border border-[var(--border)] shadow-2xl rounded-2xl py-1.5 w-40 text-xs text-[var(--text-primary)] font-medium transition-opacity duration-150 ${isPositioned ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
               style={{
                    top: `${position.top}px`,
                    left: `${position.left}px`,
               }}
          >
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