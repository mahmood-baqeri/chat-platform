// web/src/components/ChatPane/ScrollToBottomButton.tsx

import React from "react";
import { ChevronDown } from "lucide-react";

interface ScrollToBottomButtonProps {
     show: boolean;
     unreadCount: number;
     onClick: () => void;
}

export const ChatPageScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = ({
     show,
     unreadCount,
     onClick,
}) => {
     if (!show) return null;

     return (
          <button
               onClick={onClick}
               className="absolute bottom-20 left-6 z-30 w-11 h-11 rounded-full bg-[var(--sidebar)] border border-[var(--border)] text-[var(--text-primary)] shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer group"
          >
               <ChevronDown className="w-5 h-5 text-blue-500 group-hover:translate-y-0.5 transition-transform" />
               {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-blue-600 text-white font-mono text-[10px] font-bold flex items-center justify-center border-2 border-[var(--sidebar)] shadow-md">
                         {unreadCount}
                    </span>
               )}
          </button>
     );
};