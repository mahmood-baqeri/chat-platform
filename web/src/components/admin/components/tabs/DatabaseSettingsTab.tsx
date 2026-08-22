import React from "react";
import {
  Check,
  Server,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { useAdminDashboardContext } from "../../context/AdminDashboardContext";

export const DatabaseSettingsTab = () => {
  const {
    activeTab,
    dbConfig,
    setDbConfig,
    dbTesting,
    dbTestResult,
    dbSaving,
    dbSaveResult,
    handleTestDbConnection,
    handleSaveDbSettings
  } = useAdminDashboardContext();
  return (
    <>
      {/* TAB: DATABASE SETTINGS */}
      {activeTab === "database" && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="p-6 rounded-3xl bg-[#1A1D2B] border border-white/5 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">پیکربندی دیتابیس MySQL (Database Settings)</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">مشخصات اتصال به پایگاه داده MySQL جهت ذخیره‌سازی پیام‌ها و فایل‌ها</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-mono font-bold">
                MySQL Ready
              </span>
            </div>

            {/* Notifications & Result Banners */}
            {dbTestResult && (
              <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 transition-all ${dbTestResult.success
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}>
                {dbTestResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-bold">{dbTestResult.success ? "نتیجه تست اتصال:" : "خطا در برقراری ارتباط:"}</p>
                  <p className="leading-relaxed opacity-90">{dbTestResult.message}</p>
                </div>
              </div>
            )}

            {dbSaveResult && (
              <div className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${dbSaveResult.success
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}>
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{dbSaveResult.message}</span>
              </div>
            )}

            <form className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">
                    آدرس سرور دیتابیس (Host / IP) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={dbConfig.host}
                    onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                    placeholder="localhost یا 127.0.0.1"
                    className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">
                    پورت اتصال (Port) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={dbConfig.port}
                    onChange={(e) => setDbConfig({ ...dbConfig, port: parseInt(e.target.value, 10) || 3306 })}
                    placeholder="3306"
                    className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">
                    نام پایگاه داده (Database Name) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={dbConfig.database}
                    onChange={(e) => setDbConfig({ ...dbConfig, database: e.target.value })}
                    placeholder="chat_db"
                    className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">
                    نام کاربری (Username) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={dbConfig.username}
                    onChange={(e) => setDbConfig({ ...dbConfig, username: e.target.value })}
                    placeholder="root"
                    className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">
                    رمز عبور (Password)
                  </label>
                  <input
                    type="password"
                    value={dbConfig.password}
                    onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">
                    مجموعه کاراکتر (Charset)
                  </label>
                  <input
                    type="text"
                    value={dbConfig.charset}
                    onChange={(e) => setDbConfig({ ...dbConfig, charset: e.target.value })}
                    placeholder="utf8mb4"
                    className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">
                    منطقه زمانی (Timezone)
                  </label>
                  <input
                    type="text"
                    value={dbConfig.timezone}
                    onChange={(e) => setDbConfig({ ...dbConfig, timezone: e.target.value })}
                    placeholder="+03:30"
                    className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1.5">
                    حالت SSL (SSL Mode)
                  </label>
                  <select
                    value={dbConfig.sslMode}
                    onChange={(e) => setDbConfig({ ...dbConfig, sslMode: e.target.value as import("../../types/adminDashboard.types").DatabaseSslMode })}
                    className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3 text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none transition-colors"
                  >
                    <option value="disabled">غیرفعال (Disabled)</option>
                    <option value="preferred">ترجیحی (Preferred)</option>
                    <option value="required">الزامی (Required)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleTestDbConnection}
                  disabled={dbTesting}
                  className="px-5 py-3 rounded-2xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {dbTesting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>در حال اتصال...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      <span>تست اتصال به دیتابیس</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSaveDbSettings}
                  disabled={dbSaving}
                  className="px-6 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {dbSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>در حال ذخیره‌سازی...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>ذخیره تنظیمات</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Documentation Helper Box */}
          <div className="p-5 rounded-3xl bg-[#1A1D2B]/60 border border-white/5 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Server className="w-4 h-4" />
              <span>راهنمای راه‌اندازی و انتقال داده‌ها (DATABASE_SETUP.md)</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              فایل مستندات کاملی به نام <code className="text-amber-300 font-mono">DATABASE_SETUP.md</code> در ریشه پروژه قرار گرفته است که شامل کوئری‌های SQL لازم برای ساخت جداول، ایندکس‌ها، فورن‌کی‌ها، اسکریپت Migration و نحوه تنظیم متغیرهای محیطی در سرور تولید می‌باشد.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
