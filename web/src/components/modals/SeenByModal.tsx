// web/src/components/modals/SeenByModal.tsx

import React from "react";
import { X, UserCheck } from "lucide-react";

interface SeenByModalProps {
     isOpen: boolean;
     onClose: () => void;
     seenBy: any[];
}

export const SeenByModal: React.FC<SeenByModalProps> = ({ isOpen, onClose, seenBy }) => {
     if (!isOpen) return null;

     const formatTime = (isoString: string) => {
          try {
               return new Date(isoString).toLocaleTimeString("fa-IR", {
                    hour: "2-digit",
                    minute: "2-digit",
               });
          } catch {
               return "";
          }
     };

     return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-[var(--bg)] border border-[var(--border)] rounded-3xl p-5 max-w-sm w-full shadow-2xl text-white space-y-4">
                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                         <div className="flex items-center gap-2">
                              <UserCheck className="w-5 h-5 text-cyan-400" />
                              <h3 className="text-sm text-[var(--text-primary)] font-bold">
                                   لیست مشاهده‌کنندگان پیام
                              </h3>
                         </div>
                         <button
                              onClick={onClose}
                              className="p-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                         >
                              <X className="w-4 h-4" />
                         </button>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
                         {seenBy?.map((info: any) => (
                              <div
                                   key={info.userId}
                                   className="flex items-center justify-between p-2.5 rounded-2xl bg-[var(--bg)] border border-[var(--border)]"
                              >
                                   <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold flex items-center justify-center text-[10px]">
                                             {info.userDisplayName ? info.userDisplayName[0] : "ک"}
                                        </div>
                                        <span className="font-semibold text-[var(--text-primary)]/60">
                                             {info.userDisplayName}
                                        </span>
                                   </div>
                                   <span className="text-[10px] font-mono text-slate-400">
                                        {formatTime(info.seenAt)}
                                   </span>
                              </div>
                         ))}
                    </div>

                    <button
                         onClick={onClose}
                         className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-[var(--text-primary)]/50 text-xs font-bold transition-colors"
                    >
                         بستن
                    </button>
               </div>
          </div>
     );
};