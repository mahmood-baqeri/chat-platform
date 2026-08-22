import React from "react";
import {
  X,
  MessageSquare,
  Check,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { useAdminDashboardContext } from "../../context/AdminDashboardContext";

export const SendTestSmsModal = () => {
  const {
    smsConfig,
    showSendSmsModal,
    setShowSendSmsModal,
    testSmsMobile,
    setTestSmsMobile,
    testSmsMessage,
    setTestSmsMessage,
    testSmsSending,
    testSmsResult,
    handleSendTestSms
  } = useAdminDashboardContext();
  return (
    <>
      {/* MODAL: SEND TEST SMS */}
      {showSendSmsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSendTestSms} className="bg-[#181B28] border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm text-indigo-400 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span>ارسال پیامک تست ({smsConfig.provider})</span>
              </h3>
              <button type="button" onClick={() => setShowSendSmsModal(false)} className="p-1 text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            {testSmsResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${testSmsResult.success ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}>
                {testSmsResult.success ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                <span>{testSmsResult.message}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">شماره گیرنده (Mobile Number):</label>
                <input
                  type="text"
                  required
                  value={testSmsMobile}
                  onChange={(e) => setTestSmsMobile(e.target.value)}
                  placeholder="09123456789"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">متن پیامک (Message Text):</label>
                <textarea
                  rows={3}
                  required
                  value={testSmsMessage}
                  onChange={(e) => setTestSmsMessage(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowSendSmsModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs">انصراف</button>
              <button type="submit" disabled={testSmsSending} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50">
                {testSmsSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                <span>ارسال پیامک</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
