// web/src/components/modals/ReactionPickerModal.tsx

import React, { useRef, useEffect, useState } from "react";

interface ReactionPickerModalProps {
     isOpen: boolean;
     onClose: () => void;
     onSelectReaction: (emoji: string) => void;
     isMe: boolean;
     anchorRef?: React.RefObject<HTMLButtonElement | null>;
}

const quickReactions = [
     "👍", "❤️", "😂", "😮", "😢", "🔥", "🙏", "🎉", "🤔", "👏", "💯", "✨", "🥺", "😍", "🤝"
];

export const ReactionPickerModal: React.FC<ReactionPickerModalProps> = ({
     isOpen,
     onClose,
     onSelectReaction,
     isMe,
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
               const modalHeight = 60;
               const modalWidth = 280;

               let top = rect.top - modalHeight - 10;
               let left = rect.left;

               if (top < 10) {
                    top = rect.bottom + 10;
               }

               if (left + modalWidth > window.innerWidth - 10) {
                    left = window.innerWidth - modalWidth - 10;
               }

               if (left < 10) {
                    left = 10;
               }

               if (isMe) {
                    left = rect.right - modalWidth;
                    if (left < 10) left = 10;
               } else {
                    if (left + modalWidth > window.innerWidth - 10) {
                         left = window.innerWidth - modalWidth - 10;
                    }
               }

               setPosition({ top, left });
               setIsPositioned(true);
          };

          // استفاده از requestAnimationFrame برای بهبود عملکرد
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
               className={`fixed z-50 bg-[var(--sidebar)] border border-[var(--border)] shadow-xl rounded-2xl p-1.5 backdrop-blur-md transition-opacity duration-150 ${isPositioned ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
               style={{
                    top: `${position.top}px`,
                    left: `${position.left}px`,
                    maxWidth: "280px",
                    width: "max-content",
               }}
          >
               <div className="flex flex-wrap items-center justify-center gap-1 max-w-[280px]">
                    {quickReactions.map((emoji) => (
                         <button
                              key={emoji}
                              onClick={() => {
                                   onSelectReaction(emoji);
                                   onClose();
                              }}
                              className="w-7 h-7 flex items-center justify-center hover:scale-125 transition-transform text-sm flex-shrink-0"
                         >
                              {emoji}
                         </button>
                    ))}
               </div>
          </div>
     );
};