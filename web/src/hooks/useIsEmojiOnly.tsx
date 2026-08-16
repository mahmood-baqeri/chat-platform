// web/src/hooks/useIsEmojiOnly.ts

import { useMemo } from "react";

export const useIsEmojiOnly = (text?: string | null): boolean => {
     return useMemo(() => {
          if (!text) return false;

          const cleaned = text.trim();
          if (!cleaned) return false;

          // ✅ رجکس جایگزین برای تمام ایموجی‌ها
          const emojiRegex = /^[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0F}\u{200D}\u{1F1E6}-\u{1F1FF}\u{2300}-\u{23FF}\u{2B50}\u{2934}\u{2935}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\s]+$/u;

          return emojiRegex.test(cleaned);
     }, [text]);
};