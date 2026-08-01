import React from "react";
import { useChat } from "../../store/chatContext";
import { X, Download } from "lucide-react";

export const MediaViewerModal: React.FC = () => {
  const { activeMediaUrl, setActiveMediaUrl } = useChat();

  if (!activeMediaUrl) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-between p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl flex items-center justify-between text-slate-100">
        <span className="text-xs font-bold text-slate-300">{activeMediaUrl.name}</span>
        <div className="flex items-center gap-2">
          <a
            href={activeMediaUrl.url}
            download={activeMediaUrl.name}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            onClick={() => setActiveMediaUrl(null)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 max-h-[80vh]">
        {activeMediaUrl.type === "image" ? (
          <img
            src={activeMediaUrl.url}
            alt={activeMediaUrl.name}
            className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
          />
        ) : (
          <video src={activeMediaUrl.url} controls className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl" />
        )}
      </div>

      <div />
    </div>
  );
};
