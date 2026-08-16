// web/src/components/ChatPane/ChatHeader.tsx

import React from "react";
import { Chat } from "../../types";
import { ShowImage } from "@/src/utils/showImage";
import {
     Users,
     Radio,
     User,
     Pin,
     Info,
     Search,
     MoreVertical,
     ChevronRight,
} from "lucide-react";

interface ChatHeaderProps {
     activeChat: Chat;
     activeTypingList: string[];
     actualMemberCount: number;
     pinnedMessages: any[];
     onShowGroupDrawer: () => void;
     onShowPinnedModal: () => void;
     onShowSearchModal: () => void;
     onSetMobileView: (view: "sidebar" | "chat") => void;
     onShowMobileBottomSheet: () => void;
}

export const ChatPageHeader: React.FC<ChatHeaderProps> = ({
     activeChat,
     activeTypingList,
     actualMemberCount,
     pinnedMessages,
     onShowGroupDrawer,
     onShowPinnedModal,
     onShowSearchModal,
     onSetMobileView,
     onShowMobileBottomSheet,
}) => {
     return (
          <div className="h-16 px-3 sm:px-4 bg-[var(--sidebar)] border-b border-[var(--border)] text-[var(--text-primary)] flex items-center justify-between shrink-0 backdrop-blur-md z-20 transition-colors duration-200">
               <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                         onClick={() => onSetMobileView("sidebar")}
                         className="md:hidden p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--list)] transition-all shrink-0 active:scale-95 cursor-pointer"
                    >
                         <ChevronRight className="w-5 h-5" />
                    </button>

                    <div
                         onClick={onShowGroupDrawer}
                         className="flex items-center gap-2.5 cursor-pointer group min-w-0 flex-1"
                    >
                         <div className="relative shrink-0">
                              <ShowImage src={activeChat.avatarUrl} className="w-10 h-10 rounded-full object-cover ring-2 ring-cyan-500/20 group-hover:ring-cyan-500 transition-all" />
                              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 ring-2 ring-[var(--sidebar)] absolute -bottom-0.5 -left-0.5" />
                         </div>

                         <div className="text-right min-w-0 flex-1">
                              <h2 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] group-hover:text-cyan-500 transition-colors flex items-center gap-1.5 truncate">
                                   <span className="truncate">{activeChat.title}</span>
                                   {activeChat.type === "group" && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-cyan-400 font-mono shrink-0 hidden sm:inline-block">
                                             {actualMemberCount} عضو
                                        </span>
                                   )}
                              </h2>
                              <p className="text-[10px] sm:text-[11px] text-[var(--text-secondary)] flex items-center gap-1 truncate">
                                   {activeTypingList.length > 0 ? (
                                        <span className="text-cyan-500 font-medium animate-pulse truncate">
                                             {activeTypingList.join("، ")} در حال تایپ...
                                        </span>
                                   ) : (
                                        <span className="truncate">
                                             {activeChat.type === "channel"
                                                  ? "کانال رسمی"
                                                  : activeChat.type === "group"
                                                       ? `${actualMemberCount} عضو`
                                                       : "آنلاین"}
                                        </span>
                                   )}
                              </p>
                         </div>
                    </div>
               </div>

               <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <button
                         onClick={onShowSearchModal}
                         className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-cyan-500 hover:bg-[var(--list)] transition-colors cursor-pointer"
                    >
                         <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <button
                         onClick={onShowPinnedModal}
                         className="relative p-2 rounded-xl text-[var(--text-secondary)] hover:text-amber-500 hover:bg-amber-500/10 transition-colors hidden sm:flex cursor-pointer"
                    >
                         <Pin className="w-4 h-4" />
                         {pinnedMessages.length > 0 && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px] flex items-center justify-center border border-[var(--sidebar)]">
                                   {pinnedMessages.length}
                              </span>
                         )}
                    </button>

                    <button
                         onClick={onShowGroupDrawer}
                         className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--list)] transition-colors hidden sm:flex cursor-pointer"
                    >
                         <Info className="w-4 h-4" />
                    </button>

                    <button
                         onClick={onShowMobileBottomSheet}
                         className="sm:hidden p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--list)] transition-colors cursor-pointer"
                    >
                         <MoreVertical className="w-5 h-5" />
                    </button>
               </div>
          </div>
     );
};