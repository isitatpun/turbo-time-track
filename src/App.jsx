import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// 1. Import AuthProvider และ useAuth จาก Context
import { AuthProvider, useAuth } from './context/AuthContext'; 

// Layouts & Pages
import SidebarLayout from './layouts/SidebarLayout';
import Login from './pages/Login'; 

import Dashboard from './pages/Dashboard';
import EmployeePage from './pages/EmployeePage';
import ShiftPage from './pages/ShiftPage';
import ManualEntryPage from './pages/ManualEntryPage';
import DetailsPage from './pages/DetailsPage';
import UserManagement from './pages/UserManagement'; // หน้าจัดการ User (Master Admin)
import VisitorPage from './pages/VisitorPage';       // 🔥 หน้า Visitor (เพิ่มตรงนี้)

// 2. สร้าง Component สำหรับป้องกัน Route (Gatekeeper)
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="text-[#002D72] font-semibold">Loading system...</div>
      </div>
    );
  }

  // ถ้าไม่มี User (ยังไม่ Login) ให้ดีดไปหน้า Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// 3. จัดการ Route ทั้งหมดในนี้
function AppRoutes() {
  const { user, loading } = useAuth();

  // Loading Screen หลักของ App
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="text-[#002D72] font-semibold">Loading system...</div>
      </div>
    );
  }

  return (
    <Routes>
      {/* --- PUBLIC ROUTE --- */}
      {/* ถ้ามี User แล้ว ให้เด้งไป Dashboard เลย ไม่ต้อง Login ซ้ำ */}
      <Route 
        path="/login" 
        element={!user ? <Login /> : <Navigate to="/dashboard" replace />} 
      />

      {/* --- PROTECTED ROUTES (ต้องผ่าน Gatekeeper ก่อน) --- */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <SidebarLayout />
          </ProtectedRoute>
        }
      >
        {/* Default Path: Redirect to Dashboard */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* หน้าต่างๆ ของระบบ */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="employees" element={<EmployeePage />} />
        <Route path="shifts" element={<ShiftPage />} />
        <Route path="manual-entry" element={<ManualEntryPage />} />
        <Route path="details" element={<DetailsPage />} />
        
        {/* 🔥 เพิ่ม Route หน้า Visitors 🔥 */}
        <Route path="visitors" element={<VisitorPage />} />

        {/* 🔥 เพิ่ม Route หน้า User Management 🔥 */}
        <Route path="user-management" element={<UserManagement />} />
      </Route>

      {/* Catch-all: พิมพ์ URL มั่วๆ ให้เด้งกลับ */}
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}

// 4. App หลัก ครอบด้วย Provider
function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;