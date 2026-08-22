import React from "react";
import {
  X,
  Check,
  Sparkles,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { useAdminDashboardContext } from "../../context/AdminDashboardContext";

export const SendTestPushModal = () => {
  const {
    usersList,
    groupsList,
    channelsList,
    showTestPushModal,
    setShowTestPushModal,
    testPushForm,
    setTestPushForm,
    pushTargetType,
    setPushTargetType,
    selectedTargetId,
    setSelectedTargetId,
    testPushSending,
    testPushResult,
    handleSendTestPush
  } = useAdminDashboardContext();
  return (
    <>
      {/* MODAL: SEND TEST PUSH */}
      {showTestPushModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSendTestPush} className="bg-[#181B28] border border-white/10 rounded-3xl p-6 w-full max-w-lg space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm text-purple-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>ارسال اعلان Push واقعی به مرورگر</span>
              </h3>
              <button type="button" onClick={() => setShowTestPushModal(false)} className="p-1 text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            {testPushResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${testPushResult.success ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}>
                {testPushResult.success ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                <span>{testPushResult.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="text-slate-300 block mb-1 font-semibold">عنوان اعلان (Title):</label>
                <input
                  type="text"
                  required
                  value={testPushForm.title}
                  onChange={(e) => setTestPushForm({ ...testPushForm, title: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-slate-300 block mb-1 font-semibold">متن پیام (Body):</label>
                <textarea
                  rows={2}
                  required
                  value={testPushForm.message}
                  onChange={(e) => setTestPushForm({ ...testPushForm, message: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">نوع هدف (Target Type):</label>
                  <select
                    value={pushTargetType}
                    onChange={(e) => {
                      setPushTargetType(e.target.value as "all" | "user" | "room");
                      setSelectedTargetId("");
                    }}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white"
                  >
                    <option value="all">ارسال همگانی (Broadcast to All)</option>
                    <option value="user">کاربر خاص (Specific User)</option>
                    <option value="room">اعضای گفتگو / گروه / کانال خاص</option>
                  </select>
                </div>

                {pushTargetType === "user" && (
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">انتخاب کاربر:</label>
                    <select
                      value={selectedTargetId}
                      onChange={(e) => setSelectedTargetId(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white"
                    >
                      <option value="">انتخاب کاربر...</option>
                      {usersList.map((u) => (
                        <option key={u.id} value={u.id}>{u.displayName} (@{u.personCode})</option>
                      ))}
                    </select>
                  </div>
                )}

                {pushTargetType === "room" && (
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">انتخاب گفتگو / گروه / کانال:</label>
                    <select
                      value={selectedTargetId}
                      onChange={(e) => setSelectedTargetId(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white"
                    >
                      <option value="">انتخاب روم...</option>
                      <optgroup label="گروه‌ها">
                        {groupsList.map((g) => (
                          <option key={g.id} value={g.id}>{g.title} ({g.members?.length || 0} عضو)</option>
                        ))}
                      </optgroup>
                      <optgroup label="کانال‌ها">
                        {channelsList.map((c) => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">آدرس آیکون (Icon URL):</label>
                <input
                  type="text"
                  value={testPushForm.iconUrl}
                  onChange={(e) => setTestPushForm({ ...testPushForm, iconUrl: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white text-[11px]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-slate-300 block mb-1 font-semibold">لینک هدایت پس از کلیک (Target Link):</label>
                <input
                  type="text"
                  value={testPushForm.link}
                  onChange={(e) => setTestPushForm({ ...testPushForm, link: e.target.value })}
                  placeholder="/"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white text-[11px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowTestPushModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs">انصراف</button>
              <button type="submit" disabled={testPushSending} className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50">
                {testPushSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>ارسال Push به مرورگر</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
