import { useAdminDashboardContext } from "../context/AdminDashboardContext";
import { ConfirmDeleteModal } from "../../modals/ConfirmDeleteModal";
import {
  AddForbiddenWordModal,CreateRoomModal,CreateUserModal,EditMessageModal,EditRoomModal,EditUserModal,ManageRoomMembersModal,SendTestPushModal,SendTestSmsModal
} from "./modals";
export const AdminDashboardModals=()=>{const {confirmDeleteState,setConfirmDeleteState}=useAdminDashboardContext();return <><CreateUserModal/><EditUserModal/><AddForbiddenWordModal/><EditMessageModal/><ManageRoomMembersModal/><CreateRoomModal/><EditRoomModal/><SendTestSmsModal/><SendTestPushModal/><ConfirmDeleteModal isOpen={confirmDeleteState.isOpen} onClose={()=>setConfirmDeleteState(p=>({...p,isOpen:false}))} onConfirm={confirmDeleteState.onConfirm} title={confirmDeleteState.title} description={confirmDeleteState.description}/></>;};
