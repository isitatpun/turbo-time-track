import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext'; 
import { LayoutDashboard, Users, Calendar, FileText, LogOut, Bell, Clock, ClipboardEdit, UserCog } from 'lucide-react';

const SidebarLayout = () => {
  const navigate = useNavigate();
  
  // Get user and role from Context
  const { user, role } = useAuth(); 

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error.message);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      
      {/* ================= SIDEBAR ================= */}
      <aside className="w-64 flex flex-col shadow-xl z-10 bg-[#002D72] text-white">
        
        {/* Branding */}
        <div className="h-20 flex items-center px-8 border-b border-white/10">
          <Clock className="w-8 h-8 text-[#FA4786] mr-3" />
          <div>
            <span className="text-xl font-bold tracking-wide block leading-none">TimeTrack</span>
            <span className="text-[10px] text-blue-200 uppercase tracking-widest">System</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          <NavItem to="/dashboard" icon={<LayoutDashboard />} label="Dashboard" />
          <NavItem to="/employees" icon={<Users />} label="Staff" />
          
          {/* ✅ ADDED: Visitors Link */}
          <NavItem to="/visitors" icon={<Users />} label="Visitors" />
          
          <NavItem to="/shifts" icon={<Calendar />} label="Shifts" />
          <NavItem to="/details" icon={<FileText />} label="Reports" />
          <NavItem to="/manual-entry" icon={<ClipboardEdit />} label="Manual Entry" />

          {/* 🔥 Master Admin Only Section 🔥 */}
          {role === 'master_admin' && (
             <>
               <div className="pt-4 pb-2 px-2 text-[10px] font-bold text-blue-300 uppercase tracking-widest opacity-80 border-t border-white/10 mt-2">
                  Admin Zone
               </div>
               <NavItem to="/user-management" icon={<UserCog />} label="User Management" />
             </>
          )}
        </nav>

        {/* Footer (Logout) */}
        <div className="p-4 border-t border-white/10">
           <button 
             onClick={handleLogout}
             className="flex items-center px-4 py-3 text-blue-200 hover:text-white transition-colors w-full group cursor-pointer"
           >
            <LogOut className="w-5 h-5 mr-3 group-hover:text-[#FA4786] transition-colors" /> 
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#F3F4F6]">
        
        {/* Header Bar */}
        <header className="h-16 bg-white flex items-center justify-between px-8 shadow-sm">
           <h2 className="text-[#002D72] font-bold text-lg">Administrator Panel</h2>
           
           <div className="flex items-center gap-4">
             {/* Notification Bell */}
             <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
                <Bell className="w-5 h-5 text-gray-500" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
             </button>
             
             {/* User Profile Info */}
             <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <div className="text-right hidden md:block">
                    {/* Display Email */}
                    <p className="text-sm font-bold text-gray-700">
                        {user?.email || 'Guest User'}
                    </p>
                    
                    {/* Display Role */}
                    <p className="text-xs text-gray-500 uppercase">
                        {role ? role.replace('_', ' ') : 'Staff'}
                    </p>
                </div>
                
                {/* Avatar Circle (First Letter of Email) */}
                <div className="w-9 h-9 rounded-full bg-[#002D72] text-white flex items-center justify-center font-bold shadow-md ring-2 ring-gray-100 uppercase">
                    {user?.email ? user.email.charAt(0) : 'U'}
                </div>
             </div>
           </div>
        </header>
        
        {/* Page Content Rendered Here */}
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

// Helper Component for Sidebar Links
const NavItem = ({ to, icon, label }) => (
  <NavLink 
    to={to} 
    className={({ isActive }) => 
      `flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${
        isActive 
          ? "bg-white/10 border-l-4 border-[#FA4786] text-white shadow-lg" 
          : "text-blue-100 hover:bg-white/5 hover:text-white"
      }`
    }
  >
    <span className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform">{icon}</span>
    <span className="font-medium tracking-wide">{label}</span>
  </NavLink>
);

export default SidebarLayout;