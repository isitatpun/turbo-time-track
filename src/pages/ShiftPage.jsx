import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, AlertCircle, Clock, Edit, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
    getAllShiftsService,
    getAllEmployeesService,
    addShiftService,
    updateShiftService,
    deleteShiftService,
    checkShiftOverlapService
} from '../lib/services';

const DEPARTMENTS = ['Security', 'Gardener', 'Housekeeper', 'Dishwasher', 'Driver'];
const DAY_TYPE_OPTIONS = ['All', 'Workday', 'Weekend', 'Holiday_HQ'];
const DAY_TYPE_LABELS = { All: 'All Days', Workday: 'Workday', Weekend: 'Weekend', Holiday_HQ: 'Holiday (HQ)' };

const ShiftPage = () => {
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'master_admin';

  // --- STATE ---
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterDept, setFilterDept] = useState('All');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  // --- FORM STATE ---
  const [editingId, setEditingId] = useState(null);
  const [newShift, setNewShift] = useState({
    department: '',
    employee_id: '',
    active_date: '',
    expiry_date: '',
    dayShifts: [{ day_type: 'All', start_time: '08:00', end_time: '17:00' }]
  });
  const [errorMsg, setErrorMsg] = useState('');

  // --- 1. GENERATE TIME OPTIONS (24H + 15m Intervals) ---
  const timeOptions = useMemo(() => {
    const slots = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 15) {
            const hour = h.toString().padStart(2, '0');
            const minute = m.toString().padStart(2, '0');
            slots.push(`${hour}:${minute}`);
        }
    }
    return slots;
  }, []);

  // --- 2. LOAD DATA ---
  const loadData = async () => {
    setLoading(true);
    try {
        const [shiftData, empData] = await Promise.all([
            getAllShiftsService(),
            getAllEmployeesService()
        ]);
        setShifts(shiftData);
        setEmployees(empData);
    } catch (error) {
        console.error("Error loading data:", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // --- 3. HELPERS ---
  const modalEmployees = useMemo(() => {
    return employees.filter(e => e.department === newShift.department && e.effective_date);
  }, [employees, newShift.department]);

  const calculateDurationInfo = (start, end) => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start) || !timeRegex.test(end)) return { text: '-', isOvernight: false };

    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    let diffMins = (endH * 60 + endM) - (startH * 60 + startM);
    let isOvernight = false;

    if (diffMins < 0) {
        diffMins += 24 * 60;
        isOvernight = true;
    }

    const hours = (diffMins / 60).toFixed(1);
    return { text: `${hours} hrs`, isOvernight };
  };

  // --- Day Shift Row Helpers (Add mode) ---
  const updateDayShift = (index, field, value) => {
    const updated = [...newShift.dayShifts];
    updated[index] = { ...updated[index], [field]: value };
    setNewShift({ ...newShift, dayShifts: updated });
  };

  const addDayShiftRow = () => {
    const used = newShift.dayShifts.map(s => s.day_type);
    const next = DAY_TYPE_OPTIONS.find(t => !used.includes(t)) || 'Workday';
    setNewShift({
      ...newShift,
      dayShifts: [...newShift.dayShifts, { day_type: next, start_time: '08:00', end_time: '17:00' }]
    });
  };

  const removeDayShiftRow = (index) => {
    setNewShift({
      ...newShift,
      dayShifts: newShift.dayShifts.filter((_, i) => i !== index)
    });
  };

  const handleDeleteShift = async (id) => {
    try {
      await deleteShiftService(id);
      setConfirmDeleteId(null);
      await loadData();
    } catch (error) {
      console.error(error);
    }
  };

  // --- 4. HANDLERS ---
  const handleAddClick = () => {
    setEditingId(null);
    setNewShift({
      department: '', employee_id: '', active_date: '', expiry_date: '',
      dayShifts: [{ day_type: 'All', start_time: '08:00', end_time: '17:00' }]
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleEditClick = (shift) => {
    setEditingId(shift.id);
    setNewShift({
        department: shift.department,
        employee_id: shift.employee_id,
        active_date: shift.active_date,
        expiry_date: shift.expiry_date || '',
        dayShifts: [{
          day_type: shift.day_type || 'All',
          start_time: shift.start_time.slice(0, 5),
          end_time: shift.end_time.slice(0, 5)
        }]
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSaveShift = async () => {
    setErrorMsg('');

    // A. Validate top-level fields
    if (!newShift.employee_id || !newShift.active_date) {
        setErrorMsg('Please fill all required fields.');
        return;
    }

    // B. Validate each row's time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    for (const ds of newShift.dayShifts) {
        if (!timeRegex.test(ds.start_time) || !timeRegex.test(ds.end_time)) {
            setErrorMsg(`Invalid time format in "${DAY_TYPE_LABELS[ds.day_type]}" row. Use HH:mm.`);
            return;
        }
    }

    // C. No duplicate day types in the same form
    const dayTypes = newShift.dayShifts.map(s => s.day_type);
    if (new Set(dayTypes).size !== dayTypes.length) {
        setErrorMsg('Each day type can only appear once.');
        return;
    }

    // D. "All" cannot be mixed with specific types
    if (dayTypes.includes('All') && dayTypes.length > 1) {
        setErrorMsg('"All Days" covers every day type — remove other rows or use "All Days" alone.');
        return;
    }

    // E. Validate employee dates
    const selectedEmp = employees.find(e => e.id.toString() === newShift.employee_id.toString());
    if (selectedEmp) {
        if (newShift.active_date < selectedEmp.effective_date) {
            setErrorMsg(`Cannot assign shift before employee's start date (${selectedEmp.effective_date}).`);
            return;
        }
        if (selectedEmp.resignation_date && newShift.active_date > selectedEmp.resignation_date) {
            setErrorMsg(`Employee resigned on ${selectedEmp.resignation_date}.`);
            return;
        }
    }

    setIsSaving(true);
    try {
        // F. Check overlaps for all rows before saving anything
        for (const ds of newShift.dayShifts) {
            const isOverlapped = await checkShiftOverlapService(
                newShift.employee_id,
                newShift.active_date,
                newShift.expiry_date || '2099-12-31',
                ds.start_time,
                ds.end_time,
                editingId,
                ds.day_type
            );
            if (isOverlapped) {
                setErrorMsg(`Date range overlaps an existing shift for "${DAY_TYPE_LABELS[ds.day_type]}".`);
                setIsSaving(false);
                return;
            }
        }

        if (editingId) {
            const ds = newShift.dayShifts[0];
            await updateShiftService(editingId, {
                employee_id: newShift.employee_id,
                start_time: ds.start_time,
                end_time: ds.end_time,
                active_date: newShift.active_date,
                expiry_date: newShift.expiry_date || null,
                day_type: ds.day_type
            });
        } else {
            const payloads = newShift.dayShifts.map(ds => ({
                employee_id: newShift.employee_id,
                start_time: ds.start_time,
                end_time: ds.end_time,
                active_date: newShift.active_date,
                expiry_date: newShift.expiry_date || null,
                day_type: ds.day_type
            }));
            await addShiftService(payloads);
        }

        setIsModalOpen(false);
        await loadData();

    } catch (error) {
        console.error(error);
        setErrorMsg('System Error: Failed to save shift.');
    } finally {
        setIsSaving(false);
    }
  };

  const filteredShifts = shifts.filter(s => {
    if (filterDept !== 'All' && s.department !== filterDept) return false;
    if (showActiveOnly) {
        const today = new Date().toISOString().split('T')[0];
        if (s.expiry_date && s.expiry_date < today) return false;
    }
    return true;
  });

  const usedDayTypes = newShift.dayShifts.map(s => s.day_type);
  const canAddMoreRows = !editingId && usedDayTypes.length < 4 && !usedDayTypes.includes('All');

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#002D72]">Shift Management</h1>
        <button onClick={handleAddClick} className="mt-4 md:mt-0 bg-[#FA4786] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#D9366F] shadow-md transition-transform active:scale-95">
            <Plus className="w-5 h-5" /> Add Shift
        </button>
      </div>

      {/* --- FILTERS --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-gray-500 text-sm font-bold bg-gray-50 px-2 py-1 rounded">Filter:</span>
            <select className="border p-2 rounded-lg text-sm bg-white focus:ring-[#002D72] w-full md:w-48" onChange={(e) => setFilterDept(e.target.value)}>
                <option value="All">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
        </div>
        <label className="flex items-center gap-3 cursor-pointer bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 hover:border-[#002D72] transition-colors w-full md:w-auto">
            <div className="relative">
                <input type="checkbox" className="sr-only" checked={showActiveOnly} onChange={() => setShowActiveOnly(!showActiveOnly)}/>
                <div className={`block w-10 h-6 rounded-full transition-colors ${showActiveOnly ? 'bg-[#002D72]' : 'bg-gray-300'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showActiveOnly ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </div>
            <span className={`text-sm font-bold ${showActiveOnly ? 'text-[#002D72]' : 'text-gray-500'}`}>
                {showActiveOnly ? 'Showing Active Only' : 'Showing All History'}
            </span>
        </label>
      </div>

      {/* --- TABLE --- */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <table className="w-full text-sm text-left">
            <thead className="bg-[#002D72] text-white font-bold uppercase text-xs">
                <tr>
                    <th className="p-4">ID</th>
                    <th className="p-4">Employee</th>
                    <th className="p-4">Dept</th>
                    <th className="p-4 text-center">Day Type</th>
                    <th className="p-4">Time Range</th>
                    <th className="p-4 text-center">Duration</th>
                    <th className="p-4">Effective</th>
                    <th className="p-4">Expiry</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Action</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {loading ? (
                    <tr><td colSpan="10" className="p-8 text-center text-gray-400">Loading Shifts...</td></tr>
                ) : filteredShifts.map(shift => {
                    const today = new Date().toISOString().split('T')[0];
                    const isExpired = shift.expiry_date && shift.expiry_date < today;
                    const dur = calculateDurationInfo(shift.start_time.slice(0,5), shift.end_time.slice(0,5));

                    return (
                        <tr key={shift.id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="p-4 font-mono text-[#FA4786] font-medium">{shift.person_id}</td>
                            <td className="p-4 font-bold text-gray-800">{shift.name}</td>
                            <td className="p-4 text-xs text-gray-500 uppercase tracking-wide">{shift.department}</td>
                            <td className="p-4 text-center">
                                {shift.day_type === 'Workday' && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-[10px] font-bold border border-blue-200 uppercase">Workday</span>}
                                {shift.day_type === 'Weekend' && <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-[10px] font-bold border border-purple-200 uppercase">Weekend</span>}
                                {shift.day_type === 'Holiday_HQ' && <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-[10px] font-bold border border-orange-200 uppercase">Holiday HQ</span>}
                                {(!shift.day_type || shift.day_type === 'All') && <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded-full text-[10px] font-bold border border-gray-200 uppercase">All</span>}
                            </td>
                            <td className="p-4 font-mono text-[#002D72] font-medium bg-blue-50/20 rounded-lg whitespace-nowrap">
                                {shift.start_time.slice(0,5)} - {shift.end_time.slice(0,5)}
                            </td>
                            <td className="p-4 text-center">
                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold border border-gray-200 block">
                                    {dur.text}
                                </span>
                                {dur.isOvernight && <span className="text-[10px] text-purple-600 font-bold block mt-1">(Next Day)</span>}
                            </td>
                            <td className="p-4 text-green-700 font-medium">{shift.active_date}</td>
                            <td className="p-4 text-gray-500 italic">{shift.expiry_date || "Indefinite"}</td>
                            <td className="p-4 text-center">
                                {isExpired
                                    ? <span className="text-red-600 bg-red-50 px-2 py-1 rounded-full text-[10px] font-bold border border-red-100 uppercase">Inactive</span>
                                    : <span className="text-green-600 bg-green-50 px-2 py-1 rounded-full text-[10px] font-bold border border-green-100 uppercase">Active</span>
                                }
                            </td>
                            <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                    <button onClick={() => handleEditClick(shift)} className="p-2 text-gray-400 hover:text-[#002D72] hover:bg-gray-100 rounded-full transition-colors">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    {isAdmin && confirmDeleteId !== shift.id && (
                                        <button
                                            onClick={() => setConfirmDeleteId(shift.id)}
                                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                    {isAdmin && confirmDeleteId === shift.id && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setConfirmDeleteId(null)}
                                                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => handleDeleteShift(shift.id)}
                                                className="text-xs text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded font-bold"
                                            >
                                                Delete?
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
      </div>

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between mb-6 border-b pb-4">
                    <h3 className="text-xl font-bold text-[#002D72] flex items-center gap-2">
                        <Clock className="w-5 h-5"/> {editingId ? 'Edit Shift Details' : 'Assign New Shift'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X /></button>
                </div>

                {errorMsg && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm flex gap-2 items-center border border-red-100"><AlertCircle className="w-4 h-4"/> {errorMsg}</div>}

                <div className="space-y-4">

                    {/* Datalist for time options */}
                    <datalist id="timeOptions">
                        {timeOptions.map(t => <option key={t} value={t} />)}
                    </datalist>

                    {/* 1. Department */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">1. Select Department</label>
                        <select
                            className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#002D72]"
                            value={newShift.department}
                            onChange={(e) => setNewShift({...newShift, department: e.target.value, employee_id: ''})}
                            disabled={!!editingId}
                        >
                            <option value="">-- Select --</option>
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    {/* 2. Employee */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">2. Select Employee</label>
                        <select
                            className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#002D72] disabled:bg-gray-100"
                            disabled={!newShift.department || !!editingId}
                            value={newShift.employee_id}
                            onChange={(e) => setNewShift({...newShift, employee_id: e.target.value})}
                        >
                            <option value="">-- Select Name --</option>
                            {modalEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            {editingId && !modalEmployees.find(e => e.id === newShift.employee_id) && (
                                <option value={newShift.employee_id}>Current Employee</option>
                            )}
                        </select>
                    </div>

                    {/* 3. Effective / Expiry Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Effective Date</label>
                            <input type="date" className="w-full border border-gray-300 p-2.5 rounded-lg" value={newShift.active_date} onChange={e => setNewShift({...newShift, active_date: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Expiry Date</label>
                            <input type="date" className="w-full border border-gray-300 p-2.5 rounded-lg" placeholder="Optional" value={newShift.expiry_date} onChange={e => setNewShift({...newShift, expiry_date: e.target.value})} />
                        </div>
                    </div>

                    {/* 4. Day Type Shift Rows */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            3. Shift Schedule by Day Type
                            {!editingId && <span className="text-xs font-normal text-gray-400 ml-2">— add a row per day type</span>}
                        </label>

                        <div className="space-y-2">
                            {newShift.dayShifts.map((ds, index) => {
                                const dur = calculateDurationInfo(ds.start_time, ds.end_time);
                                return (
                                    <div key={index} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2">
                                        {/* Day Type badge/selector */}
                                        <select
                                            className="border border-gray-300 rounded-md p-1.5 text-xs font-bold focus:ring-2 focus:ring-[#002D72] bg-white w-32 shrink-0"
                                            value={ds.day_type}
                                            onChange={e => updateDayShift(index, 'day_type', e.target.value)}
                                        >
                                            {DAY_TYPE_OPTIONS.map(t => (
                                                <option key={t} value={t} disabled={usedDayTypes.includes(t) && ds.day_type !== t}>
                                                    {DAY_TYPE_LABELS[t]}
                                                </option>
                                            ))}
                                        </select>

                                        {/* Start time */}
                                        <input
                                            type="text"
                                            list="timeOptions"
                                            placeholder="HH:mm"
                                            maxLength={5}
                                            className="border border-gray-300 rounded-md p-1.5 text-xs font-mono text-center w-16 shrink-0"
                                            value={ds.start_time}
                                            onChange={e => updateDayShift(index, 'start_time', e.target.value)}
                                        />

                                        <span className="text-gray-400 text-xs shrink-0">—</span>

                                        {/* End time */}
                                        <input
                                            type="text"
                                            list="timeOptions"
                                            placeholder="HH:mm"
                                            maxLength={5}
                                            className="border border-gray-300 rounded-md p-1.5 text-xs font-mono text-center w-16 shrink-0"
                                            value={ds.end_time}
                                            onChange={e => updateDayShift(index, 'end_time', e.target.value)}
                                        />

                                        {/* Duration */}
                                        <span className="text-xs text-[#002D72] font-bold bg-blue-50 border border-blue-100 px-2 py-1 rounded shrink-0 min-w-13 text-center">
                                            {dur.text}
                                            {dur.isOvernight && <span className="block text-[9px] text-purple-600">+1 day</span>}
                                        </span>

                                        {/* Remove button — only shown when more than 1 row */}
                                        {newShift.dayShifts.length > 1 && !editingId ? (
                                            <button
                                                onClick={() => removeDayShiftRow(index)}
                                                className="ml-auto p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        ) : (
                                            <div className="ml-auto w-5 shrink-0" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Add Day Type row button */}
                        {canAddMoreRows && (
                            <button
                                onClick={addDayShiftRow}
                                className="mt-2 w-full border-2 border-dashed border-gray-300 text-gray-400 hover:border-[#002D72] hover:text-[#002D72] rounded-lg py-2 text-sm font-bold transition-colors flex items-center justify-center gap-1"
                            >
                                <Plus className="w-4 h-4" /> Add Day Type
                            </button>
                        )}
                    </div>

                    <button onClick={handleSaveShift} disabled={isSaving} className="w-full bg-[#002D72] text-white py-3 rounded-xl font-bold mt-2 hover:bg-blue-900 shadow-lg transform active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-50">
                        {isSaving ? <Loader2 className="animate-spin w-5 h-5"/> : (editingId ? "Update Shift" : `Save ${newShift.dayShifts.length > 1 ? `${newShift.dayShifts.length} Shifts` : 'Shift'}`)}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
export default ShiftPage;
