import React from "react";

export const ChatSkeletonLoader: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 animate-pulse">
      {/* Date Header Skeleton */}
      <div className="flex justify-center my-2">
        <div className="w-24 h-6 rounded-full bg-[var(--list)] border border-[var(--border)] opacity-60" />
      </div>

      {/* Message Bubble Left (Received) */}
      <div className="flex items-start gap-2.5 max-w-[75%]">
        <div className="w-8 h-8 rounded-full bg-[var(--list)] shrink-0" />
        <div className="bg-[var(--list)] border border-[var(--border)] p-3.5 rounded-2xl rounded-tr-none w-64 space-y-2 shadow-sm">
          <div className="h-3 bg-black/10 dark:bg-white/10 rounded w-3/4" />
          <div className="h-3 bg-black/10 dark:bg-white/10 rounded w-1/2" />
          <div className="flex justify-end pt-1">
            <div className="h-2.5 bg-black/10 dark:bg-white/10 rounded w-10" />
          </div>
        </div>
      </div>

      {/* Message Bubble Right (Sent) */}
      <div className="flex justify-end">
        <div className="bg-[#09387C]/20 border border-[#09387C]/30 p-3.5 rounded-2xl rounded-tl-none w-72 space-y-2 shadow-sm">
          <div className="h-3 bg-[#09387C]/40 rounded w-full" />
          <div className="h-3 bg-[#09387C]/40 rounded w-4/5" />
          <div className="h-3 bg-[#09387C]/30 rounded w-2/5" />
          <div className="flex justify-end pt-1">
            <div className="h-2.5 bg-[#09387C]/40 rounded w-12" />
          </div>
        </div>
      </div>

      {/* Message Bubble Left (Received Short) */}
      <div className="flex items-start gap-2.5 max-w-[75%]">
        <div className="w-8 h-8 rounded-full bg-[var(--list)] shrink-0" />
        <div className="bg-[var(--list)] border border-[var(--border)] p-3.5 rounded-2xl rounded-tr-none w-48 space-y-2 shadow-sm">
          <div className="h-3 bg-black/10 dark:bg-white/10 rounded w-4/5" />
          <div className="flex justify-end pt-1">
            <div className="h-2.5 bg-black/10 dark:bg-white/10 rounded w-10" />
          </div>
        </div>
      </div>

      {/* Media Attachment Skeleton Right */}
      <div className="flex justify-end">
        <div className="bg-[#09387C]/20 border border-[#09387C]/30 p-3.5 rounded-2xl rounded-tl-none w-60 space-y-2 shadow-sm">
          <div className="w-full h-32 rounded-xl bg-[#09387C]/30" />
          <div className="h-3 bg-[#09387C]/40 rounded w-2/3" />
          <div className="flex justify-end pt-1">
            <div className="h-2.5 bg-[#09387C]/40 rounded w-10" />
          </div>
        </div>
      </div>

      {/* Message Bubble Left (Received) */}
      <div className="flex items-start gap-2.5 max-w-[75%]">
        <div className="w-8 h-8 rounded-full bg-[var(--list)] shrink-0" />
        <div className="bg-[var(--list)] border border-[var(--border)] p-3.5 rounded-2xl rounded-tr-none w-56 space-y-2 shadow-sm">
          <div className="h-3 bg-black/10 dark:bg-white/10 rounded w-full" />
          <div className="h-3 bg-black/10 dark:bg-white/10 rounded w-2/3" />
          <div className="flex justify-end pt-1">
            <div className="h-2.5 bg-black/10 dark:bg-white/10 rounded w-8" />
          </div>
        </div>
      </div>
    </div>
  );
};
