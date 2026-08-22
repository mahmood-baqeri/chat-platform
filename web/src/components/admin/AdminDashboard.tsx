import React from "react";
import { useAdminDashboard } from "./hooks/useAdminDashboard";
import { AdminDashboardProvider } from "./context/AdminDashboardContext";
import { AdminDashboardView } from "./components/AdminDashboardView";
export const AdminDashboard:React.FC=()=>{const model=useAdminDashboard();return <AdminDashboardProvider value={model}><AdminDashboardView/></AdminDashboardProvider>;};
