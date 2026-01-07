import React, { useState, useEffect } from 'react';
import { Users, ShieldCheck, Sprout, SprayCan, Utensils, Filter, Loader2 } from 'lucide-react';
// FIX: Import from services, NOT mockData
import { getActiveEmployeesService } from '../lib/services'; 

// FIX: Define DEPARTMENTS here since we deleted mockData
const DEPARTMENTS = ['Security', 'Gardener', 'Housekeeper', 'Dishwasher'];

const Dashboard = () => {
  // State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterDept, setFilterDept] = useState('All');
  
  // Data State
  const [activeStaff, setActiveStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- EFFECT: Fetch Data when Date Changes ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch from Supabase via Service
        const data = await getActiveEmployeesService(selectedDate);
        setActiveStaff(data);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDate]); // Re-run whenever selectedDate changes

  // --- Logic: Filter the Active Staff list ---
  const filteredStaff = activeStaff.filter(emp => 
    filterDept === 'All' || emp.department === filterDept
  );

  // --- Logic: Group Stats ---
  const stats = DEPARTMENTS.map(dept => ({
    name: dept,
    count: activeStaff.filter(e => e.department === dept).length
  }));

  // Map Icons
  const getDeptIcon = (deptName) => {
    switch(deptName) {
        case 'Security': return <ShieldCheck className="w-8 h-8 text-blue-600" />;
        case 'Gardener': return <Sprout className="w-8 h-8 text-green-600" />;
        case 'Housekeeper': return <SprayCan className="w-8 h-8 text-purple-600" />;
        case 'Dishwasher': return <Utensils className="w-8 h-8 text-orange-600" />;
        default: return <Users className="w-8 h-8 text-gray-400" />;
    }
  };

  // Map Colors
  const getDeptColorBg = (deptName) => {
    switch(deptName) {
        case 'Security': return 'bg-blue-100';
        case 'Gardener': return 'bg-green-100';
        case 'Housekeeper': return 'bg-purple-100';
        case 'Dishwasher': return 'bg-orange-100';
        default: return 'bg-gray-100';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-[#002D72]">Dashboard</h1>
        
        {/* Date Picker */}
        <div className="bg-white p-1.5 rounded-lg border border-gray-200 shadow-sm">
            <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-[#002D72] focus:border-[#002D72] block w-full p-2"
            />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((dept) => (
            <div key={dept.name} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden flex items-center justify-between hover:shadow-md transition-shadow">
                <div>
                    <p className="text-gray-500 font-bold text-sm uppercase tracking-wider">{dept.name}</p>
                    {loading ? (
                       <Loader2 className="w-6 h-6 animate-spin text-[#002D72] mt-2" />
                    ) : (
                       <h3 className="text-4xl font-bold mt-2 text-[#002D72]">{dept.count}</h3>
                    )}
                    <p className="text-sm text-gray-400 mt-1 font-medium">Active Staff</p>
                </div>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getDeptColorBg(dept.name)}`}>
                    {getDeptIcon(dept.name)}
                </div>
            </div>
        ))}
      </div>
      
      {/* Active Employee List Table */}
      <div className="mt-8 bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-gray-50/50">
            <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-[#002D72]">
                    Active Staff List
                </h3>
                <span className="bg-[#002D72] text-white px-3 py-1 rounded-full text-xs font-bold">
                    {loading ? '...' : filteredStaff.length}
                </span>
            </div>

            {/* Department Filter Dropdown */}
            <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select 
                    value={filterDept}
                    onChange={(e) => setFilterDept(e.target.value)}
                    className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-[#002D72] focus:border-[#002D72] block p-2"
                >
                    <option value="All">All Departments</option>
                    {DEPARTMENTS.map(d => (
                        <option key={d} value={d}>{d}</option>
                    ))}
                </select>
            </div>
          </div>
          
          <table className="w-full">
              <thead className="bg-gray-50 text-left text-sm font-bold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-4 pl-6">ID</th>
                    <th className="p-4">Name</th>
                    <th className="p-4">Department</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                  {loading ? (
                     <tr>
                        <td colSpan="3" className="p-8 text-center text-gray-400">Loading data...</td>
                     </tr>
                  ) : filteredStaff.map(emp => (
                      <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="p-4 pl-6 font-mono text-[#FA4786] font-medium">{emp.person_id}</td>
                          <td className="p-4 font-bold text-gray-700">{emp.name}</td>
                          <td className="p-4 flex items-center gap-2">
                            <div className="scale-75 origin-left">
                                {getDeptIcon(emp.department)}
                            </div>
                            <span className="text-sm font-medium text-gray-600">
                                {emp.department}
                            </span>
                          </td>
                      </tr>
                  ))}
                  
                  {!loading && filteredStaff.length === 0 && (
                    <tr>
                        <td colSpan="3" className="p-8 text-center text-gray-400 bg-gray-50/30">
                            No active staff found in this filter.
                        </td>
                    </tr>
                  )}
              </tbody>
          </table>
      </div>
    </div>
  );
};
export default Dashboard;