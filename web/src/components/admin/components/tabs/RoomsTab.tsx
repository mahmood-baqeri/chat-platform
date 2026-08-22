import React from "react";
import {
  Users,
  Search,
  Trash2,
  Plus,
  Edit
} from "lucide-react";
import { useAdminDashboardContext } from "../../context/AdminDashboardContext";

export const RoomsTab = () => {
  const {
    activeTab,
    roomSearchQuery,
    setRoomSearchQuery,
    setShowCreateRoomModal,
    setNewRoomForm,
    setEditingRoom,
    setManagingRoomMembers,
    handleDeleteGroup,
    handleDeleteChannel,
    filteredGroups,
    filteredChannels,
    currentUser
  } = useAdminDashboardContext();
  return (
    <>
      {/* TAB 3 & 4: GROUPS & CHANNELS MANAGEMENT */}
      {(activeTab === "groups" || activeTab === "channels") && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#1A1D2B] p-4 rounded-2xl border border-white/5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={roomSearchQuery}
                onChange={(e) => setRoomSearchQuery(e.target.value)}
                placeholder={`جستجو در ${activeTab === "groups" ? "گروه‌ها" : "کانال‌ها"}...`}
                className="w-full bg-slate-900 border border-white/10 rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              onClick={() => {
                setNewRoomForm({ type: activeTab === "groups" ? "group" : "channel", title: "", description: "", avatarUrl: "", username: "", isPrivate: false, ownerId: currentUser?.id ? String(currentUser.id) : "1" });
                setShowCreateRoomModal(true);
              }}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>ایجاد {activeTab === "groups" ? "گروه جدید" : "کانال جدید"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(activeTab === "groups" ? filteredGroups : filteredChannels).map((room) => (
              <div key={room.id} className="p-4 rounded-2xl bg-[#1A1D2B] border border-white/5 space-y-3 flex flex-col justify-between hover:border-cyan-500/30 transition-all">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <img src={room.avatarUrl} alt={room.title} className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10" />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-slate-100 truncate">{room.title}</h4>
                      <p className="text-[10px] text-slate-400 font-mono truncate">@{room.username || room.id}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{room.description || "بدون توضیحات"}</p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">
                      {room.members ? room.members.length : (room.memberCount || 0)} عضو
                    </span>
                    {room.isPrivate && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                        خصوصی
                      </span>
                    )}
                    {room.isArchived && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
                        آرشیو
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setManagingRoomMembers(room)}
                      className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                      title="مدیریت اعضا"
                    >
                      <Users className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingRoom(room)}
                      className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
                      title="ویرایش"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => activeTab === "groups" ? handleDeleteGroup(room.id) : handleDeleteChannel(room.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
