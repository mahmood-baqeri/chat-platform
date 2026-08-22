import React from "react";
import {
  ToggleLeft,
  ToggleRight,
  Check,
  Sparkles,
  RefreshCw,
  Key,
  CheckCircle2
} from "lucide-react";
import { useAdminDashboardContext } from "../../context/AdminDashboardContext";

export const PushNotificationTab = () => {
  const {
    pushSubs,
    activeTab,
    pushConfig,
    setPushConfig,
    pushPolicy,
    pushSaving,
    pushSaveResult,
    showVapidSecret,
    setShowVapidSecret,
    setShowTestPushModal,
    setTestPushForm,
    fetchPushSettings,
    handleSavePushPolicy,
    handleSavePushSettings,
    handleGenerateVapidKeys,
    handleSubscribeCurrentBrowser
  } = useAdminDashboardContext();
  return (
    <>
      {/* TAB: PUSH NOTIFICATION SETTINGS */}
      {activeTab === "pushNotification" && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="p-6 rounded-3xl bg-[#1A1D2B] border border-white/5 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">پیکربندی اعلان‌های Push (Web Push Settings)</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">زیرساخت VAPID Keys و سرویس‌ورکر جهت ارسال اعلان‌های Push مرورگری</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-mono font-bold">
                  {pushConfig.subscriptionCount} اشتراک فعال
                </span>
              </div>
            </div>

            {/* Status Banners */}
            {pushSaveResult && (
              <div className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${pushSaveResult.success
                ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}>
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                <span>{pushSaveResult.message}</span>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-300">ثبت دستگاه مرورگر شما در سرویس Push:</span>
                <button
                  onClick={handleSubscribeCurrentBrowser}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all shadow-md cursor-pointer"
                >
                  فعال‌سازی Push روی این مرورگر
                </button>
              </div>
              <p className="text-slate-400 text-[11px]">
                با کلیک روی این دکمه، مرورگر شما مجوز Push را دریافت کرده و یک Subscription واقعی برای تست ارسال اعلان ایجاد می‌کند.
              </p>
            </div>

            <form onSubmit={handleSavePushSettings} className="space-y-5">
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-300 font-semibold">
                      کلید عمومی (VAPID Public Key) <span className="text-rose-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateVapidKeys}
                      className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer text-[11px]"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>تولید کلیدهای جدید VAPID</span>
                    </button>
                  </div>
                  <textarea
                    required
                    rows={2}
                    value={pushConfig.vapidPublicKey}
                    onChange={(e) => setPushConfig({ ...pushConfig, vapidPublicKey: e.target.value })}
                    placeholder="Public Key..."
                    className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-[11px] focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-300 font-semibold">
                      کلید خصوصی (VAPID Private Key) <span className="text-rose-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowVapidSecret(!showVapidSecret)}
                      className="text-slate-400 hover:text-slate-200 text-[11px]"
                    >
                      {showVapidSecret ? "مخفی کردن" : "نمایش کلید"}
                    </button>
                  </div>
                  <input
                    type={showVapidSecret ? "text" : "password"}
                    required
                    value={pushConfig.vapidPrivateKey}
                    onChange={(e) => setPushConfig({ ...pushConfig, vapidPrivateKey: e.target.value })}
                    placeholder="Private Key..."
                    className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setPushConfig({ ...pushConfig, isActive: !pushConfig.isActive })}
                    className={`p-1 rounded-full transition-colors cursor-pointer ${pushConfig.isActive ? 'text-emerald-400' : 'text-slate-600'}`}
                  >
                    {pushConfig.isActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                  </button>
                  <span className="text-slate-200 font-bold">سرویس ارسال Push فعال باشد</span>
                </div>

                {/* Push Policy Selector */}
                <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/20 space-y-2 text-xs">
                  <label className="text-purple-300 font-bold block">سیاست ارسال اعلانات (Push Policy):</label>
                  <select
                    value={pushPolicy}
                    onChange={(e) => handleSavePushPolicy(e.target.value as import("../../types/adminDashboard.types").PushPolicy)}
                    className="w-full bg-slate-900 border border-purple-500/30 rounded-xl p-3 text-white font-medium focus:outline-none"
                  >
                    <option value="always">همیشه (ارسال اعلان Push برای تمام پیام‌های جدید)</option>
                    <option value="offline_only">فقط هنگام آفلاین بودن کاربر</option>
                    <option value="mentions_only">فقط هنگام منشن شدن (@username)</option>
                    <option value="direct_only">فقط برای گفتگوهای خصوصی (پیوی)</option>
                    <option value="disabled">غیرفعال‌سازی کامل اعلانات خودکار</option>
                  </select>
                  <p className="text-[11px] text-slate-400">سیاست انتخاب شده فوراً در سرور اعمال شده و در پایگاه داده MySQL ذخیره می‌گردد.</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowTestPushModal(true)}
                  className="px-5 py-2.5 rounded-2xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>ارسال Push واقعی به کاربران / تست</span>
                </button>

                <button
                  type="submit"
                  disabled={pushSaving}
                  className="px-6 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {pushSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>در حال ذخیره...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>ذخیره تنظیمات Push</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Subscriptions Table */}
          <div className="p-6 rounded-3xl bg-[#1A1D2B] border border-white/5 space-y-4">
            <h4 className="font-bold text-xs text-slate-200 flex items-center justify-between">
              <span>لیست مرورگرهای مشترک شده ({pushSubs.length} دستگاه)</span>
              <button onClick={fetchPushSettings} className="p-1 text-slate-400 hover:text-white">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </h4>

            {pushSubs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">هیچ اشتراک درگاه Push فعالی ثبت نشده است.</p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar">
                {pushSubs.map((sub, i) => (
                  <div key={sub.id || i} className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-purple-300 font-mono block">شناسه: {sub.id}</span>
                      <span className="text-[10px] text-slate-400">کاربر: {sub.userId} | زمان ثبت: {new Date(sub.createdAt).toLocaleDateString("fa-IR")}</span>
                    </div>
                    <button
                      onClick={() => {
                        setTestPushForm(prev => ({ ...prev, targetUser: sub.id }));
                        setShowTestPushModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 text-[11px] font-bold cursor-pointer"
                    >
                      تست ارسال به این دستگاه
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
