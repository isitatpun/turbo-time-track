import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, CheckCircle, Loader2, UserCog } from 'lucide-react';

function UserManagement() {
  const { user: currentUser } = useAuth(); 
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 1. Fetch Users ---
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .schema('facility_management')
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // --- 2. Update Role ---
  const handleUpdateRole = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .schema('facility_management')
        .from('user_roles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      alert("Error updating role: " + error.message);
    }
  };

  // --- 3. Toggle Status (Approve/Suspend) ---
  const handleToggleStatus = async (userId, currentStatus) => {
    try {
        const { error } = await supabase
            .schema('facility_management')
            .from('user_roles')
            .update({ is_verified: !currentStatus })
            .eq('id', userId);
        
        if (error) throw error;
        setUsers(users.map(u => u.id === userId ? { ...u, is_verified: !currentStatus } : u));
    } catch (error) {
        alert("Error updating status: " + error.message);
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Users...</div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold text-[#002D72]">User Management</h1>
            <p className="text-sm text-gray-500 mt-1">
                You are logged in as: <span className="font-bold text-[#FA4786] uppercase">MASTER ADMIN</span>
            </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="p-4 border-b">Email</th>
              <th className="p-4 border-b">Role</th>
              <th className="p-4 border-b">Verification Status</th>
              <th className="p-4 border-b text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {users.map((u) => {
              const isMe = u.id === currentUser.id;
              return (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-medium text-gray-700">
                    {u.email}
                    {isMe && <span className="ml-2 text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 font-bold">(YOU)</span>}
                  </td>

                  <td className="p-4">
                    {isMe ? (
                       <span className="flex items-center gap-1 text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg w-fit text-xs font-bold border border-gray-200">
                         <ShieldCheck size={14} /> MASTER ADMIN
                       </span>
                    ) : (
                      <select 
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        className={`bg-white border text-gray-700 rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-[#002D72] outline-none cursor-pointer
                            ${u.role === 'master_admin' ? 'border-purple-200 text-purple-700 bg-purple-50' : 'border-gray-300'}
                        `}
                      >
                        <option value="user">General User</option>
                        <option value="admin">Admin</option>
                        <option value="master_admin">Master Admin</option>
                      </select>
                    )}
                  </td>

                  <td className="p-4">
                     {u.is_verified ? (
                       <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-600 border border-green-200">
                         <CheckCircle size={14} /> Verified
                       </span>
                     ) : (
                       <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200">
                         <Loader2 size={14} className="animate-spin" /> Pending
                       </span>
                     )}
                  </td>

                  <td className="p-4 text-right">
                    {isMe ? (
                      <span className="text-gray-300 italic text-xs font-medium pr-2">Protected</span>
                    ) : (
                      <button
                        onClick={() => handleToggleStatus(u.id, u.is_verified)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                          u.is_verified 
                            ? "text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-200" 
                            : "bg-[#00bfa5] text-white hover:bg-[#00a690] border border-transparent"
                        }`}
                      >
                        {u.is_verified ? "Suspend" : "Approve"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


export default UserManagement;