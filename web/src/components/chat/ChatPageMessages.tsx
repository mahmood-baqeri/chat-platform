// web/src/components/ChatPane/ChatMessages.tsx

import React, { RefObject } from "react";
import { Message } from "../../types";
import { Pin, Calendar, Loader2, ChevronUp, ChevronDown, Sparkles } from "lucide-react";
import { ChatSkeletonLoader } from "./ChatSkeletonLoader";
import { MessageItem } from "./MessageItem";

interface ChatMessagesProps {
     messages: Message[];
     isChatLoading: boolean;
     isLoadingMoreMessages: boolean;
     hasMoreMessages: boolean;
     isLoadingNewerMessages: boolean;
     hasMoreAfter: boolean;
     activeTypingList: string[];
     latestPinned: Message | null;
     pinnedMessages: Message[];
     onLoadMore: () => void;
     onLoadNewer: () => void;
     onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
     scrollContainerRef: React.RefObject<HTMLDivElement | null>;
     messagesEndRef: React.RefObject<HTMLDivElement | null>;
     onShowPinnedModal: () => void;
}

export const ChatPageMessages: React.FC<ChatMessagesProps> = ({
     messages,
     isChatLoading,
     isLoadingMoreMessages,
     hasMoreMessages,
     isLoadingNewerMessages,
     hasMoreAfter,
     activeTypingList,
     latestPinned,
     pinnedMessages,
     onLoadMore,
     onLoadNewer,
     onScroll,
     scrollContainerRef,
     messagesEndRef,
     onShowPinnedModal,
}) => {
     const formatDateLabel = (isoString: string) => {
          try {
               const d = new Date(isoString);
               const now = new Date();
               const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
               const yesterday = new Date(today);
               yesterday.setDate(yesterday.getDate() - 1);

               const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

               if (msgDate.getTime() === today.getTime()) return "امروز";
               if (msgDate.getTime() === yesterday.getTime()) return "دیروز";

               return d.toLocaleDateString("fa-IR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
               });
          } catch {
               return "";
          }
     };

     const groupedItems = React.useMemo(() => {
          const items: { type: "date" | "message"; label?: string; message?: Message; isFirstInGroup?: boolean }[] = [];
          let currentDateLabel = "";
          let lastSenderIdInDateGroup: string | number | null = null;

          messages.forEach((msg) => {
               const label = formatDateLabel(msg.createdAt);
               if (label && label !== currentDateLabel) {
                    currentDateLabel = label;
                    lastSenderIdInDateGroup = null;
                    items.push({ type: "date", label });
               }
               const isFirstInGroup = String(msg.senderId) !== String(lastSenderIdInDateGroup);
               lastSenderIdInDateGroup = msg.senderId;
               items.push({ type: "message", message: msg, isFirstInGroup });
          });

          return items;
     }, [messages]);

     if (isChatLoading) {
          return <ChatSkeletonLoader />;
     }

     return (
          <div
               ref={scrollContainerRef}
               onScroll={onScroll}
               className={`flex-1 overflow-y-auto space-y-3 sophisticated-chat-bg custom-scrollbar ${latestPinned ? 'px-4 sm:px-6 pb-4 sm:pb-6 pt-0' : 'p-4 sm:p-6'}`}
          >
               {/* Pinned Message Banner */}
               {latestPinned && (
                    <div
                         onClick={onShowPinnedModal}
                         className="sticky top-0 left-0 right-0 z-20 bg-amber-500/10 hover:bg-amber-500/15 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-amber-500 
                         backdrop-blur-md cursor-pointer transition-all shadow-sm -mx-4 mb-3"
                         style={{
                              backdropFilter: 'blur(12px)',
                              WebkitBackdropFilter: 'blur(12px)'
                         }}
                    >
                         <div className="flex items-center gap-2 truncate flex-1 min-w-0 px-4">
                              <Pin className="w-4 h-4 text-amber-500 shrink-0" />
                              <span className="font-bold shrink-0">آخرین پیام پین‌شده ({pinnedMessages.length}):</span>
                              <span className="truncate text-[var(--text-secondary)]">{latestPinned.content || "فایل ضمیمه"}</span>
                         </div>
                         <span className="text-[10px] text-amber-500/80 hover:underline shrink-0 ml-2 px-2">مشاهده همه</span>
                    </div>
               )}

               {isLoadingMoreMessages ? (
                    <div className="flex items-center justify-center gap-2 py-2.5 text-xs text-blue-500 font-medium">
                         <Loader2 className="w-4 h-4 animate-spin" />
                         <span>در حال دریافت پیام‌های قدیمی‌تر...</span>
                    </div>
               ) : hasMoreMessages ? (
                    <div className="flex justify-center my-2">
                         <button
                              onClick={onLoadMore}
                              className="px-3.5 py-1.5 rounded-full bg-[var(--sidebar)] border border-[var(--border)] text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                         >
                              <ChevronUp className="w-3.5 h-3.5" />
                              <span>بارگذاری پیام‌های قدیمی‌تر</span>
                         </button>
                    </div>
               ) : null}

               {messages.length === 0 ? (
                    <div className="py-20 text-center text-[var(--text-secondary)]">
                         <Sparkles className="w-10 h-10 mx-auto mb-2 text-blue-500/40" />
                         <p className="text-xs font-semibold text-[var(--text-primary)]">پیامی ثبت نشده است</p>
                         <p className="text-[11px] text-[var(--text-secondary)] mt-1">نخستین پیام این گفتگو را بنویسید.</p>
                    </div>
               ) : (
                    groupedItems.map((item, index) => {
                         if (item.type === "date") {
                              return (
                                   <div key={`date-${item.label}-${index}`} className="flex items-center justify-center my-4 sticky top-2 z-10 pointer-events-none">
                                        <span className="bg-[var(--sidebar)] text-[var(--text-secondary)] border border-[var(--border)] px-3.5 py-1 rounded-full text-[10px] font-bold shadow-md flex items-center gap-1.5 min-w-[110px] justify-center text-center opacity-95">
                                             <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
                                             <span>{item.label}</span>
                                        </span>
                                   </div>
                              );
                         }
                         return (
                              <MessageItem key={item.message!.id} message={item.message!} isFirstInGroup={item.isFirstInGroup ?? true} />
                         );
                    })
               )}

               {isLoadingNewerMessages ? (
                    <div className="flex items-center justify-center gap-2 py-2.5 text-xs text-blue-500 font-medium">
                         <Loader2 className="w-4 h-4 animate-spin" />
                         <span>در حال دریافت پیام‌های جدیدتر...</span>
                    </div>
               ) : hasMoreAfter ? (
                    <div className="flex justify-center my-2">
                         <button
                              onClick={onLoadNewer}
                              className="px-3.5 py-1.5 rounded-full bg-[var(--sidebar)] border border-[var(--border)] text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                         >
                              <ChevronDown className="w-3.5 h-3.5" />
                              <span>بارگذاری پیام‌های جدیدتر</span>
                         </button>
                    </div>
               ) : null}

               {activeTypingList.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] py-2 px-3.5 rounded-2xl bg-[var(--sidebar)] border border-[var(--border)] w-fit animate-in fade-in duration-200 my-2 shadow-sm">
                         <div className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                         </div>
                         <span className="text-[11px] font-medium text-blue-400">
                              {activeTypingList.join("، ")} در حال نوشتن...
                         </span>
                    </div>
               )}

               <div ref={messagesEndRef} />
          </div>
     );
};