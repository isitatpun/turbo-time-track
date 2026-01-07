import React, { useState, useEffect, useMemo } from 'react';
import { Save, UserPlus, AlertTriangle, Loader2, Edit3, ArrowRight, XCircle } from 'lucide-react';
import { getAllEmployeesService, addManualEntry, fetchLogs } from '../lib/services'; 

const DEPARTMENTS = ['Security', 'Gardener', 'Housekeeper', 'Dishwasher'];

const ManualEntryPage = () => {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('add'); // 'add' or 'edit'
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Log Checking State
  const [foundLog, setFoundLog] = useState(null); // Stores the log if found
  const [checkingLog, setCheckingLog] = useState(false);

  const [formData, setFormData] = useState({
    department: '',
    employee_id: '',
    person_no: '',
    date: new Date().toISOString().split('T')[0],
    clock_in: '',
    clock_out: '',
    reason: ''
  });

  const [message, setMessage] = useState(null);

  // --- 1. LOAD EMPLOYEES ---
  useEffect(() => {
    const loadData = async () => {
        try {
            const data = await getAllEmployeesService();
            setEmployees(data);
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Failed to load employees.' });
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, []);

  // --- 2. CHECK LOGS (Runs on Date/Person change for BOTH tabs) ---
  useEffect(() => {
    const checkLogExistence = async () => {
        // Reset previous state
        setFoundLog(null);
        
        if (!formData.person_no || !formData.date) return;
        
        setCheckingLog(true);
        try {
            const logs = await fetchLogs(formData.date, formData.date);
            const userLog = logs.find(l => l.person_no === formData.person_no);
            
            if (userLog) {
                setFoundLog(userLog);
                
                // If in Edit Mode, Auto-fill
                if (activeTab === 'edit') {
                    const inTime = userLog.checkIn ? (userLog.checkIn.includes('T') ? userLog.checkIn.split('T')[1].slice(0,5) : userLog.checkIn.slice(0,5)) : '';
                    const outTime = userLog.checkOut ? (userLog.checkOut.includes('T') ? userLog.checkOut.split('T')[1].slice(0,5) : userLog.checkOut.slice(0,5)) : '';
                    
                    setFormData(prev => ({
                        ...prev,
                        clock_in: inTime,
                        clock_out: outTime
                    }));
                }
            } else {
                // If in Edit Mode but no log, clear inputs
                if (activeTab === 'edit') {
                    setFormData(prev => ({ ...prev, clock_in: '', clock_out: '' }));
                }
            }
        } catch (error) {
            console.error("Error checking logs:", error);
        } finally {
            setCheckingLog(false);
        }
    };

    const timeout = setTimeout(checkLogExistence, 500);
    return () => clearTimeout(timeout);
  }, [formData.person_no, formData.date, activeTab]);


  // --- LOGIC ---
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => !formData.department || e.department === formData.department);
  }, [employees, formData.department]);

  const handleEmployeeChange = (e) => {
    const selectedId = e.target.value;
    const emp = employees.find(ep => ep.id.toString() === selectedId);
    
    setFormData({
        ...formData, 
        employee_id: selectedId,
        person_no: emp ? emp.person_id : '' 
    });
  };

  const handleTabChange = (tab) => {
      setActiveTab(tab);
      setMessage(null);
      setFoundLog(null);
      setFormData(prev => ({ ...prev, clock_in: '', clock_out: '', reason: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    // BLOCKING LOGIC: If Adding and Log Exists -> Stop
    if (activeTab === 'add' && foundLog) {
        setMessage({ type: 'error', text: 'Cannot Add: Record already exists. Please switch to Edit tab.' });
        return;
    }

    if (!formData.person_no || !formData.date || !formData.clock_in || !formData.clock_out || !formData.reason) {
        setMessage({ type: 'error', text: 'Please fill all fields.' });
        return;
    }

    // Guard: In Edit mode, ensure there is something to edit
    if (activeTab === 'edit' && !foundLog) {
        setMessage({ type: 'error', text: 'No existing log found to edit for this date.' });
        return;
    }

    setIsSaving(true);

    try {
        const payload = {
            person_no: formData.person_no,
            date: formData.date,
            manual_entry_timestamp: `${formData.date}T${formData.clock_in}:00`, 
            manual_exit_timestamp: `${formData.date}T${formData.clock_out}:00`,
            edit_reason: formData.reason,
            updated_by: 'admin', 
            updated_at: new Date().toISOString()
        };

        await addManualEntry(payload);

        setMessage({ 
            type: 'success', 
            text: activeTab === 'add' ? 'Manual Entry Added!' : 'Log Updated Successfully!' 
        });

        setFormData(prev => ({ ...prev, reason: '' }));
        
        // Refresh Log State
        setFoundLog(prev => ({
             ...prev,
             checkIn: payload.manual_entry_timestamp,
             checkOut: payload.manual_exit_timestamp
        }));

    } catch (error) {
        setMessage({ type: 'error', text: 'Failed to save: ' + error.message });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#002D72] mb-6">Manual Adjustments</h1>

      {/* --- TABS --- */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 w-full max-w-2xl">
          <button 
            onClick={() => handleTabChange('add')}
            className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'add' ? 'border-[#FA4786] text-[#FA4786]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
              <UserPlus className="w-4 h-4" /> Add New / Insert
          </button>
          <button 
            onClick={() => handleTabChange('edit')}
            className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'edit' ? 'border-[#FA4786] text-[#FA4786]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
              <Edit3 className="w-4 h-4" /> Edit Existing
          </button>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-md max-w-2xl border border-gray-100">
        
        {/* Header based on Tab */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            {activeTab === 'add' ? <UserPlus className="w-6 h-6 text-[#FA4786]" /> : <Edit3 className="w-6 h-6 text-[#FA4786]" />}
            <div>
                <h2 className="text-xl font-bold text-gray-800">
                    {activeTab === 'add' ? 'Insert New Record' : 'Correct Existing Record'}
                </h2>
                <p className="text-sm text-gray-500">
                    {activeTab === 'add' 
                        ? 'Use this for missed punches or forgotten cards.' 
                        : 'Use this to fix incorrect times or machine errors.'}
                </p>
            </div>
        </div>

        {message && (
            <div className={`p-3 rounded-lg mb-6 text-sm font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message.text}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Common Fields */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Department</label>
                    <select 
                        className="w-full border p-2.5 rounded-lg focus:ring-[#002D72]"
                        value={formData.department}
                        onChange={e => setFormData({...formData, department: e.target.value, employee_id: '', person_no: ''})}
                    >
                        <option value="">-- Select Dept --</option>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Employee</label>
                    <select 
                        className="w-full border p-2.5 rounded-lg focus:ring-[#002D72]"
                        disabled={loading}
                        value={formData.employee_id}
                        onChange={handleEmployeeChange}
                    >
                        <option value="">{loading ? "Loading..." : "-- Select Name --"}</option>
                        {filteredEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Date</label>
                <input 
                    type="date" 
                    className="w-full border p-2.5 rounded-lg"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                />
            </div>

            {/* --- BLOCKING ALERT FOR ADD TAB --- */}
            {activeTab === 'add' && foundLog && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg animate-pulse">
                    <div className="flex items-center gap-2 text-red-700 font-bold mb-1">
                        <XCircle className="w-5 h-5" /> 
                        Action Blocked: Data Exists
                    </div>
                    <p className="text-sm text-red-600">
                        Attendance data already exists for this date. 
                        You cannot use "Add New". Please switch to the 
                        <button 
                            type="button" 
                            onClick={() => handleTabChange('edit')}
                            className="ml-1 underline font-bold hover:text-red-800"
                        >
                            Edit Existing
                        </button> tab.
                    </p>
                </div>
            )}

            {/* --- COMPARISON VIEW FOR EDIT TAB --- */}
            {activeTab === 'edit' && formData.person_no && formData.date && (
                <div className={`p-4 rounded-lg border text-sm ${foundLog ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                    {checkingLog ? (
                        <div className="flex items-center gap-2 text-gray-500"><Loader2 className="w-4 h-4 animate-spin"/> Searching for log...</div>
                    ) : foundLog ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[#002D72] font-bold border-b border-blue-200 pb-2 mb-2">
                                <AlertTriangle className="w-4 h-4" /> Original Record Found
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2 text-gray-600">
                                <div>
                                    <span className="text-xs uppercase font-bold text-gray-400">Current In</span>
                                    <div className="font-mono font-bold">
                                        {foundLog.checkIn ? (foundLog.checkIn.includes('T') ? foundLog.checkIn.split('T')[1].slice(0,5) : foundLog.checkIn.slice(0,5)) : '-'}
                                    </div>
                                </div>
                                <div className="flex justify-center text-blue-300"><ArrowRight className="w-4 h-4"/></div>
                                <div>
                                    <span className="text-xs uppercase font-bold text-gray-400">Current Out</span>
                                    <div className="font-mono font-bold">
                                        {foundLog.checkOut ? (foundLog.checkOut.includes('T') ? foundLog.checkOut.split('T')[1].slice(0,5) : foundLog.checkOut.slice(0,5)) : '-'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-orange-600 font-bold flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4"/> No log found to edit for this date.
                        </div>
                    )}
                </div>
            )}

            {/* Time Inputs - Disable if Add Blocked */}
            <div className={`grid grid-cols-2 gap-4 ${activeTab === 'add' && foundLog ? 'opacity-50 pointer-events-none' : ''}`}>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">New Clock In</label>
                    <input 
                        type="time" 
                        required
                        className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-[#002D72]"
                        value={formData.clock_in}
                        onChange={e => setFormData({...formData, clock_in: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">New Clock Out</label>
                    <input 
                        type="time" 
                        required
                        className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-[#002D72]"
                        value={formData.clock_out}
                        onChange={e => setFormData({...formData, clock_out: e.target.value})}
                    />
                </div>
            </div>

            <div className={activeTab === 'add' && foundLog ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-sm font-bold text-gray-700 mb-1">Reason for {activeTab === 'add' ? 'Entry' : 'Edit'} <span className="text-red-500">*</span></label>
                <textarea 
                    required
                    rows="2"
                    placeholder={activeTab === 'add' ? "e.g. Forgot ID Card" : "e.g. System glitch, wrong time"}
                    className="w-full border p-2.5 rounded-lg text-sm"
                    value={formData.reason}
                    onChange={e => setFormData({...formData, reason: e.target.value})}
                />
            </div>

            {/* DISABLE BUTTON IF ADD & FOUND, OR EDIT & NOT FOUND */}
            <button 
                type="submit"
                disabled={isSaving || (activeTab === 'add' && !!foundLog) || (activeTab === 'edit' && !foundLog)}
                className={`w-full text-white py-3 rounded-xl font-bold mt-4 shadow-lg transform active:scale-95 transition-all flex justify-center gap-2 items-center disabled:opacity-50 disabled:cursor-not-allowed
                    ${activeTab === 'add' ? 'bg-[#002D72] hover:bg-blue-900' : 'bg-[#FA4786] hover:bg-[#d63a6e]'}
                `}
            >
                {isSaving ? <Loader2 className="animate-spin w-5 h-5"/> : <Save className="w-5 h-5" />} 
                {isSaving ? 'Saving...' : (activeTab === 'add' ? 'Save New Entry' : 'Update Record')}
            </button>
        </form>
      </div>
    </div>
  );
};

export default ManualEntryPage;