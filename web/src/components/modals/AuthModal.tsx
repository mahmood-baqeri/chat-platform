// web/src/components/modals/AuthModal.tsx

import React, { useState, useEffect, useRef } from "react";
import { useChat } from "../../store/chatContext";
import { api } from "../../services/api";
import { wsClient } from "../../services/websocket";
import { requestAllPermissionsAfterLogin } from "../../utils/permissions";
import { X, Phone, KeyRound, ShieldCheck, Sparkles, BadgeCheck, RefreshCw } from "lucide-react";
import { ShowImage } from "@/src/utils/showImage";
import { LogoPhoto } from "@/src/types";
import OtpInput from 'react-otp-input';

export const AuthModal: React.FC = () => {
  const { showAuthModal, setShowAuthModal, setCurrentUser, currentUser, systemSettings } = useChat();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [sentOtp, setSentOtp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // تایمر
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // برای جلوگیری از ارسال مجدد
  const hasSubmittedRef = useRef(false);

  // شروع تایمر هنگام ورود به مرحله OTP
  useEffect(() => {
    if (step === "otp") {
      startTimer();
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [step]);

  // auto-submit وقتی کد کامل شد
  useEffect(() => {
    if (step === "otp" && otpCode.length === 5 && !isLoading && !hasSubmittedRef.current) {
      hasSubmittedRef.current = true;
      const timer = setTimeout(() => {
        handleVerifyOtp();
      }, 100);
      return () => clearTimeout(timer);
    } else if (otpCode.length !== 5) {
      hasSubmittedRef.current = false;
    }
  }, [otpCode, step, isLoading]);

  const startTimer = () => {
    setTimer(60);
    setCanResend(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    timerIntervalRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current!);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setIsLoading(true);
    setErrorMsg("");
    hasSubmittedRef.current = false;
    try {
      const res = await api.sendOtp(phone);
      setSentOtp(res.otp);
      setStep("otp");
      startTimer();
    } catch (err: any) {
      setErrorMsg(err.message || "خطا در ارسال کد تأیید");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || isLoading) return;

    setIsLoading(true);
    setErrorMsg("");
    hasSubmittedRef.current = false;
    setOtpCode("");
    try {
      const res = await api.sendOtp(phone);
      setSentOtp(res.otp);
      startTimer();
    } catch (err: any) {
      setErrorMsg(err.message || "خطا در ارسال مجدد کد تأیید");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!phone || !phone.trim()) {
      setErrorMsg("شماره تلفن یافت نشد، لطفاً مرحله قبل را دوباره انجام دهید");
      setStep("phone");
      return;
    }

    if (!otpCode || otpCode.length < 5) {
      setErrorMsg("لطفاً کد ۵ رقمی را کامل وارد کنید");
      return;
    }

    if (isLoading) return;

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
        targetRoute = (redirectTarget.startsWith("/chat/") || redirectTarget.startsWith("/admin"))
          ? redirectTarget
          : (redirectTarget === "/login" ? "/" : redirectTarget);
      }

      // مدیریت history برای جلوگیری از برگشت به لاگین
      try {
        window.history.replaceState(null, "", targetRoute);
        // اضافه کردن state اضافی برای جلوگیری از خروج
        window.history.pushState(null, "", targetRoute);
      } catch (e) { }

      // ریست کردن stateهای مودال
      setOtpCode("");
      setErrorMsg("");
      setStep("phone");
      hasSubmittedRef.current = false;

    } catch (err: any) {
      console.error("❌ خطا در تایید کد:", err);
      setErrorMsg(err.message || "کد تأیید اشتباه است");
      setOtpCode("");
      hasSubmittedRef.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // اگر کاربر لاگین هست، چیزی نشون نده
  if (currentUser) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[var(--bg)] border border-white/10 rounded-3xl p-6 w-full max-w-sm text-white shadow-2xl animate-in zoom-in-95 duration-200 text-center">
        {/* لوگو */}
        <div className="w-50 mx-auto mb-5 mt-4 rounded-2xl flex items-center">
          <ShowImage src={LogoPhoto} className="w-full h-full object-cover" />
        </div>

        <h3 className="font-bold text-base text-[var(--text-primary)] mb-1">
          ورود به فیـــــــدار
        </h3>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-2.5 rounded-xl mb-4">
            {errorMsg}
          </div>
        )}

        {step === "phone" ? (
          <form onSubmit={handleSendOtp} className="space-y-4 mt-5">
            <div className="text-right">
              <div className="relative">
                <BadgeCheck className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
                    setPhone(value);
                  }}
                  placeholder="شماره موبایل / کد پرسنلی / کد ملی"
                  className="w-full border border-[var(--border)] rounded-xl pr-9 pl-3 py-2.5 text-xs text-[var(--text-primary)] font-mono focus:border-blue-500 focus:outline-none text-center"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-[var(--main-color)] hover:bg-[var(--main-color)]/80 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? "در حال ارسال..." : "ارسال کد یکبارمصرف"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-right">
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                کد تأیید ۵ رقمی
              </label>
              <div className="otpElement flex justify-center">
                <OtpInput
                  value={otpCode}
                  onChange={(value) => {
                    const numericValue = value.replace(/[^0-9]/g, '').slice(0, 5);
                    setOtpCode(numericValue);
                    hasSubmittedRef.current = false;
                  }}
                  numInputs={5}
                  inputType="tel"
                  renderSeparator={<span className="mx-1 text-slate-500">-</span>}
                  renderInput={(props, index) => (
                    <input
                      {...props}
                      key={index}
                      className="border border-[var(--border)] rounded-xl bg-transparent text-[var(--text-primary)] focus:border-blue-500 focus:outline-none transition-all"
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleVerifyOtp();
                        }
                      }}
                    />
                  )}
                  inputStyle={{
                    width: '2.5rem',
                    height: '2.5rem',
                    fontSize: '2rem',
                    textAlign: 'center',
                    margin: '0.5rem',
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setOtpCode("");
                  setErrorMsg("");
                  hasSubmittedRef.current = false;
                }}
                className="w-1/3 py-2.5 rounded-xl bg-[var(--sidebar)] hover:bg-[var(--sidebar)]/80 text-[var(--text-primary)] text-xs transition-all border border-[var(--border)] disabled:opacity-50 cursor-pointer"
              >
                اصلاح شماره
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-2/3 py-2.5 rounded-xl bg-[var(--main-color)] hover:bg-[var(--main-color)]/80 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? "در حال بررسی..." : "تأیید و ورود"}
              </button>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2 border-t border-white/5">
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isLoading}
                  className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-all disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  ارسال مجدد کد
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>ارسال مجدد کد</span>
                  <span className="font-mono bg-white/5 px-2 py-0.5 rounded-md text-blue-400">
                    {formatTime(timer)}
                  </span>
                </div>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};