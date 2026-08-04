import React, { useState } from "react";
import { useChat } from "../../store/chatContext";
import { api } from "../../services/api";
import { wsClient } from "../../services/websocket";
import { requestAllPermissionsAfterLogin } from "../../utils/permissions";
import { X, Phone, KeyRound, ShieldCheck, Sparkles } from "lucide-react";

export const AuthModal: React.FC = () => {
  const { showAuthModal, setShowAuthModal, setCurrentUser, currentUser, systemSettings } = useChat();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("09121111111");
  const [otpCode, setOtpCode] = useState("123456");
  const [sentOtp, setSentOtp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!showAuthModal && currentUser) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await api.sendOtp(phone);
      setSentOtp(res.otp);
      setStep("otp");
    } catch (err: any) {
      setErrorMsg(err.message || "خطا در ارسال کد تأیید");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) return;

    setIsLoading(true);
    setErrorMsg("");
    try {
      const { user, token } = await api.verifyOtp(phone, otpCode);
      localStorage.setItem("app_auth_token", token);
      localStorage.setItem("app_token_timestamp", Date.now().toString());
      localStorage.setItem("app_user_id", user.id);

      setCurrentUser(user);
      wsClient.connect(user.id);
      setShowAuthModal(false);
      requestAllPermissionsAfterLogin(user.id);

      const redirectTarget = sessionStorage.getItem("redirect_after_login") || localStorage.getItem("pending_chat_id");
      sessionStorage.removeItem("redirect_after_login");
      localStorage.removeItem("pending_chat_id");

      let targetRoute = "/";
      if (redirectTarget) {
        targetRoute = (redirectTarget.startsWith("/chat/") || redirectTarget.startsWith("/admin")) ? redirectTarget : (redirectTarget === "/login" ? "/" : redirectTarget);
      }
      try {
        window.history.pushState({}, "", targetRoute);
        window.dispatchEvent(new Event("popstate"));
      } catch (e) {}
    } catch (err: any) {
      setErrorMsg(err.message || "کد تأیید اشتباه است");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1A1D2B] border border-white/10 rounded-3xl p-6 w-full max-w-sm text-white shadow-2xl animate-in zoom-in-95 duration-200 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
          <ShieldCheck className="w-6 h-6" />
        </div>

        <h3 className="font-bold text-base text-slate-100 mb-1">ورود به پلتفرم چت</h3>
        <p className="text-xs text-slate-400 mb-6">برای شروع ارتباط امن، شماره موبایل خود را وارد کنید</p>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-2.5 rounded-xl mb-4">
            {errorMsg}
          </div>
        )}

        {step === "phone" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="text-right">
              <label className="block text-xs font-semibold text-slate-300 mb-1">شماره تلفن همراه</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09121111111"
                  className="w-full bg-[#141724] border border-white/10 rounded-xl pr-9 pl-3 py-2.5 text-xs text-slate-100 font-mono text-left focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {isLoading ? "در حال ارسال..." : "ارسال کد یکبارمصرف (OTP)"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {sentOtp && (
              <div className="bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs p-2 rounded-xl">
                کد تست جهت ورود سریع: <span className="font-mono font-bold">{sentOtp}</span>
              </div>
            )}

            <div className="text-right">
              <label className="block text-xs font-semibold text-slate-300 mb-1">کد تأیید ۶ رقمی</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full bg-[#141724] border border-white/10 rounded-xl pr-9 pl-3 py-2.5 text-sm font-mono tracking-widest text-center text-slate-100 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep("phone")}
                className="w-1/3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs"
              >
                اصلاح شماره
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-2/3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                {isLoading ? "در حال بررسی..." : "تأیید و ورود"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
