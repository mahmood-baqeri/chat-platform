import React from "react";
import {
  X
} from "lucide-react";
import { useAdminDashboardContext } from "../../context/AdminDashboardContext";
import { ShowImage } from "@/src/utils/showImage";

export const ManageRoomMembersModal = () => {
  const {
    usersList,
    managingRoomMembers,
    setManagingRoomMembers,
    newMemberUserId,
    setNewMemberUserId,
    handleAddMemberToRoom,
    handleRemoveMemberFromRoom,
    handleTransferOwnership
  } = useAdminDashboardContext();
  return (
    <>
      {/* MODAL: MANAGE ROOM MEMBERS */}
      {managingRoomMembers && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181B28] border border-white/10 rounded-3xl p-6 w-full max-w-lg space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm">مدیریت اعضای {managingRoomMembers.title}</h3>
              <button onClick={() => setManagingRoomMembers(null)} className="p-1 text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <select value={newMemberUserId} onChange={(e) => setNewMemberUserId(e.target.value)} className="flex-1 bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white">
                  <option value="">انتخاب کاربر جهت افزودن...</option>
                  {usersList.filter((u) => !managingRoomMembers.members.some((m) => String(m.userId) === String(u.id))).map((u) => (
                    <option key={u.id} value={u.id}>{u.displayName} (@{u.personCode})</option>
                  ))}
                </select>
                <button onClick={handleAddMemberToRoom} className="px-4 py-2.5 bg-cyan-600 text-white rounded-xl text-xs font-bold shrink-0">افزودن</button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
                {managingRoomMembers.members.map((m) => {
                  const u = usersList.find((usr) => String(usr.id) === String(m.userId));
                  const isOwner = String(managingRoomMembers.ownerId) === String(m.userId);
                  return (
                    <div key={m.userId} className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <ShowImage src={u?.avatarUrl} className="w-7 h-7 rounded-full object-cover" />
                        <div>
                          <p className="font-bold text-slate-200">{u?.displayName || m.userId}</p>
                          <span className="text-[10px] text-slate-400 font-mono">{isOwner ? "مالک روم (Owner)" : m.role}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isOwner && (
                          <>
                            <button onClick={() => handleTransferOwnership(String(m.userId))} className="p-1.5 rounded bg-amber-500/10 text-amber-400 text-[10px]" title="انتقال مالکیت">
                              انتقال مالکیت
                            </button>
                            <button onClick={() => handleRemoveMemberFromRoom(String(m.userId))} className="p-1.5 rounded bg-rose-500/10 text-rose-400 text-[10px]">
                              اخراج
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
