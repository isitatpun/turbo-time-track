import React, { useState, useEffect } from 'react';
import { Edit, CalendarPlus, Save, X, AlertCircle, Loader2 } from 'lucide-react';
import { getAllEmployeesService, updateEmployeeService } from '../lib/services'; // IMPORT SERVICES

const DEPARTMENTS = ['Security', 'Gardener', 'Housekeeper', 'Dishwasher'];

const EmployeePage = () => {
  // --- STATE ---
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filterDept, setFilterDept] = useState('All');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [formData, setFormData] = useState({ effective_date: '', resignation_date: '' });
  const [isIndefinite, setIsIndefinite] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // New loading state for Save button

  // --- 1. LOAD DATA ---
  const loadEmployees = async () => {
    setLoading(true);
    try {
        const data = await getAllEmployeesService();
        setEmployees(data);
    } catch (error) {
        console.error("Failed to load employees:", error);
        alert("Error loading employee data.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  // --- 2. FILTER LOGIC ---
  const filteredList = employees.filter(emp => filterDept === 'All' || emp.department === filterDept);

  // Pending: Employees with NO effective_date set
  const pendingEmployees = filteredList.filter(emp => !emp.effective_date);

  // Established: Employees WITH effective_date
  const establishedEmployees = filteredList.filter(emp => {
    if (!emp.effective_date) return false;
    
    if (showActiveOnly) {
        const currentDate = new Date().toISOString().split('T')[0];
        const effDate = new Date(emp.effective_date);
        const resDate = emp.resignation_date ? new Date(emp.resignation_date) : null;
        const now = new Date(currentDate);
        // Logic: Started already AND (Has not resigned OR Resignation is in future)
        return now >= effDate && (!resDate || now <= resDate);
    }
    return true; // Show everyone if toggle is off
  });

  // --- HANDLERS ---
  const openModal = (emp) => {
    setEditingEmp(emp);
    
    const hasResignation = !!emp.resignation_date;
    
    setFormData({
        effective_date: emp.effective_date || '',
        resignation_date: emp.resignation_date || ''
    });
    setIsIndefinite(!hasResignation);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    // Validation
    if (!formData.effective_date) {
        alert("Please select an Effective Date");
        return;
    }

    if (!isIndefinite && formData.resignation_date) {
        if (formData.resignation_date < formData.effective_date) {
            alert("Error: Resignation Date cannot be before Effective Date.");
            return;
        }
    }

    setIsSaving(true);
    try {
        // Construct Payload for Supabase
        const updates = {
            effective_date: formData.effective_date,
            resignation_date: isIndefinite ? null : formData.resignation_date
        };

        // Call Service
        await updateEmployeeService(editingEmp.id, updates);

        // Success: Close Modal & Refresh Data
        setIsModalOpen(false);
        await loadEmployees(); 

    } catch (error) {
        alert("Failed to save: " + error.message);
    } finally {
        setIsSaving(false);
    }
  };

  if (loading && employees.length === 0) {
      return <div className="p-8 text-center text-gray-500">Loading Employees...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#002D72]">Employee Management</h1>
      </div>

      {/* --- FILTER SECTION --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div className="flex items-center gap-3">
            <span className="text-gray-600 font-bold bg-gray-100 px-3 py-1.5 rounded-lg text-sm">Filter:</span>
            <select 
                className="border border-gray-300 p-2 rounded-lg text-[#002D72] font-medium focus:ring-[#002D72] min-w-45"
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
            >
                <option value="All">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
        </div>

        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 shadow-sm hover:border-[#FA4786] transition-colors">
            <input 
                type="checkbox" 
                id="activeToggle"
                className="w-5 h-5 accent-[#FA4786] cursor-pointer"
                checked={showActiveOnly} 
                onChange={() => setShowActiveOnly(!showActiveOnly)} 
            />
            <label htmlFor="activeToggle" className="text-gray-700 font-bold cursor-pointer select-none text-sm">
                Show Active Only (As of Today)
            </label>
        </div>
      </div>

      {/* --- PART 1: PENDING SETUP --- */}
      {pendingEmployees.length > 0 && (
        <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="text-orange-500" />
                <h3 className="text-xl font-bold text-gray-700">1. Pending Setup (No Effective Date)</h3>
            </div>
            <div className="bg-white rounded-xl shadow-sm border-l-4 border-orange-400 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-orange-50 text-orange-800">
                        <tr>
                            <th className="p-3 text-left">Person ID</th>
                            <th className="p-3 text-left">Name</th>
                            <th className="p-3 text-left">Department</th>
                            <th className="p-3 text-left">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendingEmployees.map(emp => (
                            <tr key={emp.id} className="border-b last:border-0 hover:bg-orange-50/20">
                                <td className="p-3 font-mono">{emp.person_id}</td>
                                <td className="p-3 font-bold">{emp.name}</td>
                                <td className="p-3">{emp.department}</td>
                                <td className="p-3">
                                    <button 
                                        onClick={() => openModal(emp)}
                                        className="bg-orange-500 text-white px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 hover:bg-orange-600 shadow-sm"
                                    >
                                        <CalendarPlus className="w-4 h-4" /> Set Dates
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* --- PART 2: ESTABLISHED EMPLOYEES --- */}
      <div>
        <div className="flex items-center gap-2 mb-4">
            <h3 className="text-xl font-bold text-[#002D72]">2. Employee List ({showActiveOnly ? 'Active' : 'All History'})</h3>
            <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full font-bold">{establishedEmployees.length}</span>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
                <thead className="bg-[#002D72] text-white">
                    <tr>
                        <th className="p-4 text-left">Person ID</th>
                        <th className="p-4 text-left">Name</th>
                        <th className="p-4 text-left">Department</th>
                        <th className="p-4 text-left">Effective Date</th>
                        <th className="p-4 text-left">Resignation Date</th>
                        <th className="p-4 text-left">Edit</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {establishedEmployees.map(emp => (
                        <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="p-4 font-mono text-[#FA4786] font-medium">{emp.person_id}</td>
                            <td className="p-4 font-bold text-gray-800">{emp.name}</td>
                            <td className="p-4">
                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs border border-gray-200">
                                    {emp.department}
                                </span>
                            </td>
                            <td className="p-4 text-green-700 font-medium">{emp.effective_date}</td>
                            <td className="p-4 text-red-600">
                                {emp.resignation_date ? emp.resignation_date : <span className="text-gray-400 italic">- Indefinite -</span>}
                            </td>
                            <td className="p-4">
                                <button 
                                    onClick={() => openModal(emp)}
                                    className="text-gray-400 hover:text-[#002D72] transition-colors p-2 hover:bg-gray-100 rounded-full"
                                >
                                    <Edit className="w-5 h-5" />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {establishedEmployees.length === 0 && (
                        <tr><td colSpan="6" className="p-8 text-center text-gray-400">No employees found in this criteria.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* --- UNIFIED MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-[#002D72]">
                            {editingEmp.effective_date ? 'Edit Employment Dates' : 'Set Initial Dates'}
                        </h3>
                        <p className="text-gray-500 text-sm mt-1">{editingEmp.name} (ID: {editingEmp.person_id})</p>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500"><X /></button>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Effective Date (Start) <span className="text-red-500">*</span></label>
                        <input 
                            type="date" 
                            className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#002D72] focus:border-[#002D72]"
                            value={formData.effective_date}
                            onChange={e => setFormData({...formData, effective_date: e.target.value})}
                        />
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-bold text-gray-700">Resignation Date</label>
                            
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-500 select-none">
                                <input 
                                    type="checkbox" 
                                    checked={isIndefinite}
                                    onChange={(e) => {
                                        setIsIndefinite(e.target.checked);
                                        if (e.target.checked) {
                                            setFormData({...formData, resignation_date: ''});
                                        }
                                    }}
                                    className="accent-[#FA4786]"
                                />
                                Indefinite (ไม่สิ้นสุด)
                            </label>
                        </div>
                        
                        <input 
                            type="date" 
                            className={`w-full border p-2.5 rounded-lg transition-all ${isIndefinite ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white border-gray-300 focus:ring-2 focus:ring-red-500'}`}
                            value={formData.resignation_date}
                            disabled={isIndefinite} 
                            min={formData.effective_date} 
                            onChange={e => setFormData({...formData, resignation_date: e.target.value})}
                        />
                        {isIndefinite && <p className="text-xs text-green-600 mt-2 font-medium">Currently working indefinitely</p>}
                    </div>

                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full bg-[#002D72] text-white py-3 rounded-xl font-bold text-lg hover:bg-blue-900 shadow-lg transform active:scale-95 transition-all flex justify-center gap-2 items-center disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default EmployeePage;