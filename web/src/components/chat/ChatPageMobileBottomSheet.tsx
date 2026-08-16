// web/src/components/ChatPane/MobileBottomSheet.tsx

import React from "react";
import { Chat } from "../../types";
import { ShowImage } from "@/src/utils/showImage";
import { X, Search, Pin, Info } from "lucide-react";

interface MobileBottomSheetProps {
     isOpen: boolean;
     onClose: () => void;
     activeChat: Chat;
     pinnedMessages: any[];
     onShowSearchModal: () => void;
     onShowPinnedModal: () => void;
     onShowGroupDrawer: () => void;
}

export const ChatPageMobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
     isOpen,
     onClose,
     activeChat,
     pinnedMessages,
     onShowSearchModal,
     onShowPinnedModal,
     onShowGroupDrawer,
}) => {
     if (!isOpen) return null;

     return (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:hidden animate-in fade-in duration-200">
               <div className="bg-[var(--sidebar)] border-t border-[var(--border)] rounded-t-3xl p-5 w-full shadow-2xl text-[var(--text-primary)] space-y-3 animate-in slide-in-from-bottom duration-250">
                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                         <div className="flex items-center gap-2">
                              <ShowImage src={activeChat.avatarUrl} className="w-8 h-8 rounded-full object-cover" />
                              <span className="font-bold text-sm truncate">{activeChat.title}</span>
                         </div>
                         <button onClick={onClose} className="p-1 rounded-xl bg-[var(--list)] text-[var(--text-secondary)]">
                              <X className="w-5 h-5" />
                         </button>
                    </div>

                    <div className="space-y-1 text-xs">
                         <button
                              onClick={() => {
                                   onClose();
                                   onShowSearchModal();
                              }}
                              className="w-full text-right p-3 rounded-2xl hover:bg-[var(--list)] flex items-center gap-3 text-[var(--text-primary)] font-medium"
                         >
                              <Search className="w-4 h-4 text-blue-500" />
                              <span>جستجو در گفتگو</span>
                         </button>

                         <button
                              onClick={() => {
                                   onClose();
                                   onShowPinnedModal();
                              }}
                              className="w-full text-right p-3 rounded-2xl hover:bg-[var(--list)] flex items-center justify-between text-[var(--text-primary)] font-medium"
                         >
                              <div className="flex items-center gap-3">
                                   <Pin className="w-4 h-4 text-amber-500" />
                                   <span>پیام‌های پین‌شده</span>
                              </div>
                              {pinnedMessages.length > 0 && (
                                   <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-bold font-mono text-[10px]">
                                        {pinnedMessages.length}
                                   </span>
                              )}
                         </button>

                         <button
                              onClick={() => {
                                   onClose();
                                   onShowGroupDrawer();
                              }}
                              className="w-full text-right p-3 rounded-2xl hover:bg-[var(--list)] flex items-center gap-3 text-[var(--text-primary)] font-medium"
                         >
                              <Info className="w-4 h-4 text-emerald-500" />
                              <span>اطلاعات و اعضای گفتگو</span>
                         </button>
                    </div>

                    <button
                         onClick={onClose}
                         className="w-full py-3 rounded-2xl bg-[var(--list)] text-[var(--text-secondary)] font-bold text-xs"
                    >
                         انصراف
                    </button>
               </div>
          </div>
     );
};