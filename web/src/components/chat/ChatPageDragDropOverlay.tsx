// web/src/components/ChatPane/DragDropOverlay.tsx

import React from "react";
import { Upload } from "lucide-react";

interface DragDropOverlayProps {
     isDragging: boolean;
}

export const ChatPageDragDropOverlay: React.FC<DragDropOverlayProps> = ({ isDragging }) => {
     if (!isDragging) return null;

     return (
          <div className="absolute inset-0 z-50 bg-cyan-600/20 backdrop-blur-md border-2 border-dashed border-cyan-400 rounded-2xl flex flex-col items-center justify-center text-white pointer-events-none animate-in fade-in duration-150">
               <div className="w-20 h-20 rounded-3xl bg-cyan-500/30 border border-cyan-400/50 flex items-center justify-center mb-4 shadow-2xl animate-bounce">
                    <Upload className="w-10 h-10 text-cyan-300" />
               </div>
               <h3 className="text-lg font-bold text-white mb-1">فایل را رها کنید</h3>
               <p className="text-xs text-cyan-900">جهت ارسال سریع فایل به این گفتگو آن را اینجا رها کنید</p>
          </div>
     );
};