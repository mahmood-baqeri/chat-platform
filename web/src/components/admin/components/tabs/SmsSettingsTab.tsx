import React from "react";
import {
  MessageSquare,
  ToggleLeft,
  ToggleRight,
  Check,
  RotateCcw,
  Radio,
  Bell,
  RefreshCw,
  Key,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { useAdminDashboardContext } from "../../context/AdminDashboardContext";

export const SmsSettingsTab = () => {
  const {
    activeTab,
    smsConfig,
    setSmsConfig,
    smsTesting,
    smsTestResult,
    smsSaving,
    smsSaveResult,
    setShowSendSmsModal,
    handleTestSmsConnection,
    handleSaveSmsSettings,
    handleResetSmsSettings
  } = useAdminDashboardContext();
  return (
    <>
      {/* TAB: SMS SETTINGS */}
      {activeTab === "smsSettings" && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="p-6 rounded-3xl bg-[#1A1D2B] border border-white/5 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">پیکربندی پنل پیامک (SMS Provider Settings)</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">تنظیمات درگاه ارسال پیامک جهت اعتبارسنجی OTP و نوتیفیکیشن‌ها</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-mono font-bold">
                SMS API Ready
              </span>
            </div>

            {/* Notifications & Result Banners */}
            {smsTestResult && (
              <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 transition-all ${smsTestResult.success
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}>
                {smsTestResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-bold">{smsTestResult.success ? "نتیجه تست ارتباط:" : "خطا در برقراری ارتباط:"}</p>
                  <p className="leading-relaxed opacity-90">{smsTestResult.message}</p>
                </div>
              </div>
            )}

            {smsSaveResult && (
              <div className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${smsSaveResult.success
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}>
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{smsSaveResult.message}</span>
              </div>
            )}

            <form className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">
                    سامانه پیامک (SMS Provider) <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={smsConfig.provider}
                    onChange={(e) => setSmsConfig({ ...smsConfig, provider: e.target.value })}
                    className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 text-xs focus:border-amber-500 focus:outline-none transition-colors"
                  >
                    <option value="smsir">SMS.ir (سامانه پیامکی رسمی SMS.ir - REST API v1)</option>
                    <option value="kavenegar">کاوه نگار (Kavenegar)</option>
                    <option value="ghasedak">قاصدک (Ghasedak)</option>
                    <option value="farazsms">فراز اس‌ام‌اس (FarazSMS / IPPanel)</option>
                    <option value="melipayamak">ملی پیامک (MeliPayamak)</option>
                    <option value="custom">درگاه اختصاصی (Custom Webhook API)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">
                    کلید API (API Key) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={smsConfig.apiKey}
                    onChange={(e) => setSmsConfig({ ...smsConfig, apiKey: e.target.value })}
                    placeholder="مشخصات API Key..."
                    className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">
                    کلید محرمانه (Secret Key)
                  </label>
                  <input
                    type="password"
                    value={smsConfig.secretKey}
                    onChange={(e) => setSmsConfig({ ...smsConfig, secretKey: e.target.value })}
                    placeholder="Secret Key (در صورت نیاز)..."
                    className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">
                    شماره فرستنده / خط (Sender / Line Number) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={smsConfig.senderNumber}
                    onChange={(e) => setSmsConfig({ ...smsConfig, senderNumber: e.target.value })}
                    placeholder="مثال: 30000000"
                    className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">
                    شناسه قالب الگوی OTP / سریع (Template ID)
                  </label>
                  <input
                    type="text"
                    value={smsConfig.templateId}
                    onChange={(e) => setSmsConfig({ ...smsConfig, templateId: e.target.value })}
                    placeholder="شناسه پترن / الگوی OTP..."
                    className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">
                    مهلت زمان‌پاسخ دهی (Timeout ثانیه)
                  </label>
                  <input
                    type="number"
                    value={smsConfig.timeout}
                    onChange={(e) => setSmsConfig({ ...smsConfig, timeout: parseInt(e.target.value) || 10 })}
                    className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">
                    نام کاربری سامانه (Username)
                  </label>
                  <input
                    type="text"
                    value={smsConfig.username}
                    onChange={(e) => setSmsConfig({ ...smsConfig, username: e.target.value })}
                    placeholder="نام کاربری ورودی پنل..."
                    className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 text-xs focus:border-amber-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">
                    رمز عبور (Password)
                  </label>
                  <input
                    type="password"
                    value={smsConfig.password}
                    onChange={(e) => setSmsConfig({ ...smsConfig, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="md:col-span-2 flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSmsConfig({ ...smsConfig, isActive: !smsConfig.isActive })}
                    className={`p-1 rounded-full transition-colors cursor-pointer ${smsConfig.isActive ? 'text-emerald-400' : 'text-slate-600'}`}
                  >
                    {smsConfig.isActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                  </button>
                  <span className="text-slate-200 font-bold">سرویس ارسال پیامک فعال باشد</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleResetSmsSettings}
                  className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>بازنشانی به پیش‌فرض</span>
                </button>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowSendSmsModal(true)}
                    className="px-4 py-2.5 rounded-2xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>ارسال پیامک تست</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestSmsConnection}
                    disabled={smsTesting}
                    className="px-4 py-2.5 rounded-2xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {smsTesting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>در حال تست...</span>
                      </>
                    ) : (
                      <>
                        <Radio className="w-4 h-4" />
                        <span>بررسی اتصال</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveSmsSettings}
                    disabled={smsSaving}
                    className="px-6 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {smsSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>در حال ذخیره...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>ذخیره تنظیمات</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
