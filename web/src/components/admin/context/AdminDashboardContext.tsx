import { createContext,useContext,type ReactNode } from "react";
import { useAdminDashboard } from "../hooks/useAdminDashboard";
export type AdminDashboardModel=ReturnType<typeof useAdminDashboard>;
const C=createContext<AdminDashboardModel|null>(null);
export const AdminDashboardProvider=({value,children}:{value:AdminDashboardModel;children:ReactNode})=><C.Provider value={value}>{children}</C.Provider>;
export const useAdminDashboardContext=()=>{const c=useContext(C);if(!c)throw new Error("useAdminDashboardContext must be used inside AdminDashboardProvider");return c;};
