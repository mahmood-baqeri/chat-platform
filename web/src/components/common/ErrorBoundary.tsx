import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught Error caught by ErrorBoundary:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#121420] text-slate-200 border border-white/5 rounded-2xl m-2 text-center shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-100 mb-1">
            {this.props.fallbackTitle || "خطایی در این بخش رخ داده است"}
          </h3>
          <p className="text-xs text-slate-400 max-w-xs mb-4 leading-relaxed font-sans">
            {this.state.error?.message || "مشکلی در پردازش این بخش پیش آمد، اما سایر بخش‌های برنامه‌ بدون مشکل فعال هستند."}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-blue-500/20"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>تلاش مجدد و بارگذاری این بخش</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
