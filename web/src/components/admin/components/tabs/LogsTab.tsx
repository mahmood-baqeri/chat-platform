import React from "react";
import {
  Bell
} from "lucide-react";
import { useAdminDashboardContext } from "../../context/AdminDashboardContext";

export const LogsTab=()=>{
  const {
  logs,
  pushSubs,
  activeTab
  }=useAdminDashboardContext();
  return (
    <>
{/* TAB 10: LOGS */}
          {activeTab === "logs" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 text-xs flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span>تعداد اشتراک‌های فعال Push Notification:</span>
                </span>
                <span className="font-bold text-amber-400 font-mono">{pushSubs.length} دستگاه</span>
              </div>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-cyan-400">{log.action}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{new Date(log.timestamp).toLocaleTimeString("fa-IR")}</span>
                    </div>
                    <p className="text-slate-300">{log.details}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
    </>
  );
};
