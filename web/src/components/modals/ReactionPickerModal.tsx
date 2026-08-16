// web/src/components/modals/ReactionPickerModal.tsx

import React from "react";

interface ReactionPickerModalProps {
     isOpen: boolean;
     onClose: () => void;
     onSelectReaction: (emoji: string) => void;
     isMe: boolean;
}

const quickReactions = [
     "👍",   // لایک
     "❤️",   // عشق
     "😂",   // خنده
     "😮",   // تعجب
     "😢",   // ناراحتی
     "🔥",   // آتش
     "🙏",   // دعا
     "🎉",   // جشن
     "🤔",   // فکر
     "👏",   // تشویق
     "💯",   // صد درصد
     "✨",   // درخشان
     "🥺",   // التماس
     "😍",   // عاشقانه
     "🤝",   // دست دادن
];

export const ReactionPickerModal: React.FC<ReactionPickerModalProps> = ({
     isOpen,
     onClose,
     onSelectReaction,
     isMe,
}) => {
     if (!isOpen) return null;

     return (
          <div
               className={`absolute -top-10 z-30 bg-[var(--sidebar)] border border-[var(--border)] shadow-xl rounded-2xl p-1.5 flex items-center gap-1 backdrop-blur-md ${isMe ? "right-0" : "left-0"
                    }`}
          >
               {quickReactions.map((emoji) => (
                    <button
                         key={emoji}
                         onClick={() => {
                              onSelectReaction(emoji);
                              onClose();
                         }}
                         className="w-7 h-7 flex items-center justify-center hover:scale-125 transition-transform text-sm"
                    >
                         {emoji}
                    </button>
               ))}
          </div>
     );
};