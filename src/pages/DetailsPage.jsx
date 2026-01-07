import React, { useState, useEffect, useMemo } from 'react';
import { Download, FileDown, Loader2, FileText, LayoutList } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
    getAllEmployeesService, 
    fetchLogs, 
    fetchShifts, 
    fetchDateDim 
} from '../lib/services'; 

const DEPARTMENTS = ['Security', 'Gardener', 'Housekeeper', 'Dishwasher'];

const DetailsPage = () => {
  // --- HELPER: Calculate Previous Week (Mon-Sun) ---
  const getPreviousWeekRange = () => {
    const today = new Date();
    const day = today.getDay(); // 0 (Sun) to 6 (Sat)
    const diffToCurrentMonday = (day === 0 ? -6 : 1) - day;
    
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() + diffToCurrentMonday);

    const prevMonday = new Date(currentMonday);
    prevMonday.setDate(currentMonday.getDate() - 7);

    const prevSunday = new Date(prevMonday);
    prevSunday.setDate(prevMonday.getDate() + 6);

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${d}`;
    };

    return { start: formatDate(prevMonday), end: formatDate(prevSunday) };
  };

  // --- STATE ---
  // 1. Auto-set date to Previous Week
  const [dateRange, setDateRange] = useState(getPreviousWeekRange());
  const [filterDept, setFilterDept] = useState('All');
  const [filterName, setFilterName] = useState('All');
  
  const [employees, setEmployees] = useState([]);
  const [logs, setLogs] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [dateDim, setDateDim] = useState([]); 
  
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // --- 1. FETCH DATA ---
  useEffect(() => {
    const loadReportData = async () => {
      setLoading(true);
      try {
        const endDatePlusOne = new Date(dateRange.end);
        endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
        const fetchEnd = endDatePlusOne.toISOString().split('T')[0];

        const [empData, logData, shiftData, dateData] = await Promise.all([
            getAllEmployeesService(),
            fetchLogs(dateRange.start, fetchEnd), 
            fetchShifts(dateRange.start, dateRange.end),
            fetchDateDim(dateRange.start, dateRange.end)
        ]);

        setEmployees(empData);
        setLogs(logData);
        setShifts(shiftData);
        setDateDim(dateData);

      } catch (error) {
        console.error("Error loading report data:", error);
        alert("Failed to load data. Check console.");
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, [dateRange]);

  // --- 2. FILTER LOGIC ---
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
       const matchDept = filterDept === 'All' || e.department === filterDept;
       const matchName = filterName === 'All' || e.name === filterName;
       return matchDept && matchName;
    });
  }, [employees, filterDept, filterName]);

  useEffect(() => { setFilterName('All'); }, [filterDept]);

  // --- 3. HELPERS ---
  const toMinutes = (timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // --- 4. MAIN LOGIC LOOP ---
  const generateData = () => {
    if (loading) return { breakdown: [], summary: [] };

    let breakdown = [];
    let summaryMap = {};

    filteredEmployees.forEach(emp => {
        summaryMap[emp.id] = {
            person_id: emp.person_id, 
            name: emp.name, 
            department: emp.department,
            total_days: 0, 
            present: 0, 
            absent: 0, 
            on_time: 0, 
            late: 0, 
            leave_early: 0, 
            both: 0, 
            manual_edit_count: 0
        };
    });

    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);

    filteredEmployees.forEach(emp => {
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const currentStr = d.toISOString().split('T')[0];
            const nextD = new Date(d);
            nextD.setDate(d.getDate() + 1);
            const nextDayStr = nextD.toISOString().split('T')[0];

            const dateInfo = dateDim.find(item => item.date === currentStr);
            const dayType = dateInfo ? dateInfo.day_type : "Workday"; 

            summaryMap[emp.id].total_days++;

            const shift = shifts.find(s => 
                (s.employee_id === emp.id || s.person_id === emp.person_id) && 
                new Date(s.active_date) <= d && 
                (!s.expiry_date || new Date(s.expiry_date) >= d)
            );

            const log = logs.find(l => l.person_no === emp.person_id && l.date === currentStr);
            const nextLog = logs.find(l => l.person_no === emp.person_id && l.date === nextDayStr);

            let status = "Day Off"; 
            if (dayType.includes("Holiday")) status = "Holiday"; 

            let flag = "Auto"; 
            let actualIn = null;
            let actualOut = null;
            let actualRange = "-";
            let shiftDuration = 0;

            if (shift) {
                const sStartM = toMinutes(shift.start_time.slice(0,5));
                const sEndM = toMinutes(shift.end_time.slice(0,5));
                shiftDuration = sEndM - sStartM;
                if (shiftDuration < 0) shiftDuration += 1440; 

                const startH = parseInt(shift.start_time.split(':')[0]);
                const endH = parseInt(shift.end_time.split(':')[0]);
                const isNightShift = startH > endH;

                if (isNightShift) {
                    if (log) actualIn = log.checkOut || log.checkIn; 
                    if (nextLog) actualOut = nextLog.checkIn;
                } else {
                    if (log) {
                        actualIn = log.checkIn;
                        actualOut = log.checkOut;
                    }
                }

                if ((log && log.source === 'manual') || (isNightShift && nextLog && nextLog.source === 'manual')) {
                    flag = 'Manual';
                }

                if (actualIn) {
                    summaryMap[emp.id].present++;
                    if (flag !== 'Auto') summaryMap[emp.id].manual_edit_count++;

                    const fmtIn = actualIn.includes('T') ? actualIn.split('T')[1].slice(0,5) : actualIn.slice(0,5);
                    const fmtOut = actualOut ? (actualOut.includes('T') ? actualOut.split('T')[1].slice(0,5) : actualOut.slice(0,5)) : null;
                    
                    actualRange = `${fmtIn} - ${fmtOut || '?'}`;
                    if (isNightShift) actualRange += " (+1)";

                    // 1. Lateness Check
                    let isLate = false;
                    const shiftStartMins = toMinutes(shift.start_time.slice(0,5));
                    const actualInMins = toMinutes(fmtIn);
                    
                    let adjustedInMins = actualInMins;
                    if (shiftStartMins > 720 && actualInMins < 480) adjustedInMins += 1440;
                    
                    if (adjustedInMins > shiftStartMins) isLate = true;

                    // 2. Early Leave Check (STRICT)
                    let isEarlyLeave = false;
                    if (fmtOut) {
                        const actualOutMins = toMinutes(fmtOut);
                        let workMins = actualOutMins - actualInMins;
                        if (workMins < 0) workMins += 1440; 

                        if (workMins < shiftDuration) {
                            isEarlyLeave = true;
                        }
                    }

                    // 3. Status Logic
                    if (isLate && isEarlyLeave) {
                        status = "Late & Early"; 
                        summaryMap[emp.id].both++; 
                    } else if (isLate) {
                        status = "Late";
                        summaryMap[emp.id].late++; 
                    } else if (isEarlyLeave) {
                        status = "Left Early";
                        summaryMap[emp.id].leave_early++; 
                    } else {
                        status = "On Time";
                        summaryMap[emp.id].on_time++; 
                    }

                } else {
                    status = "Absent";
                    summaryMap[emp.id].absent++;
                }
            } else {
                if (log) {
                    status = "Extra"; 
                    summaryMap[emp.id].present++;
                    let t1 = log.checkIn ? log.checkIn.slice(11,16) : '?';
                    let t2 = log.checkOut ? log.checkOut.slice(11,16) : '?';
                    actualRange = `${t1} - ${t2}`;
                }
            }

            breakdown.push({
                date: currentStr, day_type: dayType, 
                person_id: emp.person_id, name: emp.name, department: emp.department,
                shift_in: shift ? shift.start_time.slice(0,5) : '-',
                shift_out: shift ? shift.end_time.slice(0,5) : '-',
                actual_range: actualRange, 
                status: status, flag: flag
            });
        }
    });
    
    return {
        breakdown: breakdown.sort((a,b) => new Date(a.date) - new Date(b.date)),
        summary: Object.values(summaryMap)
    };
  };

  const { breakdown, summary } = generateData();

  // --- PDF EXPORT ---
  const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary);
  };

  const exportPDF = async () => {
    setIsExporting(true);
    try {
        const PDFConstructor = jsPDF.jsPDF || jsPDF;
        const doc = new PDFConstructor();
        
        const fontRes = await fetch('/fonts/Sarabun-Regular.ttf');
        const fontBuffer = await fontRes.arrayBuffer();
        doc.addFileToVFS("Sarabun-Regular.ttf", arrayBufferToBase64(fontBuffer));
        doc.addFont("Sarabun-Regular.ttf", "Sarabun", "normal");
        doc.setFont("Sarabun");

        doc.setFontSize(18); doc.setTextColor(0, 45, 114);
        doc.text("Attendance Report", 14, 20);
        doc.setFontSize(10); doc.setTextColor(100);
        doc.text(`Period: ${dateRange.start} - ${dateRange.end}`, 14, 28);
        doc.text(`Filter: ${filterDept} | ${filterName}`, 14, 34);

        doc.setFontSize(14); doc.setTextColor(0);
        doc.text("1. Summary", 14, 45);
        autoTable(doc, {
            startY: 50,
            head: [["ID", "Name", "Dept", "Total", "Present", "On Time", "Absent", "Late", "Left Early", "Late & Left Early", "Manual"]],
            body: summary.map(r => [
                r.person_id, r.name, r.department, 
                r.total_days, r.present, 
                r.on_time, 
                r.absent, r.late, 
                r.leave_early, r.both, r.manual_edit_count
            ]),
            styles: { font: "Sarabun", fontSize: 9, halign: 'center' },
            headStyles: { fillColor: [250, 71, 134] }
        });

        let finalY = doc.lastAutoTable.finalY + 15;
        doc.text("2. Breakdown", 14, finalY);
        autoTable(doc, {
            startY: finalY + 5,
            head: [["Date", "Type", "ID", "Name", "Shift", "Actual", "Status"]],
            body: breakdown.map(r => [
                r.date, r.day_type, r.person_id, r.name, 
                `${r.shift_in}-${r.shift_out}`, r.actual_range, r.status
            ]),
            styles: { font: "Sarabun", fontSize: 8, halign: 'center' },
            headStyles: { fillColor: [0, 45, 114] },
            didParseCell: (data) => {
                if(data.column.index === 6 && data.section === 'body') {
                    if(data.cell.raw.includes('Late') || data.cell.raw.includes('Early')) data.cell.styles.textColor = [234, 88, 12];
                    if(data.cell.raw === 'Absent') data.cell.styles.textColor = [220, 38, 38];
                }
            }
        });

        doc.save(`Report_${dateRange.start}.pdf`);
    } catch (error) {
        console.error(error);
        alert("Export Failed");
    } finally { setIsExporting(false); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#002D72]">Details & Reports</h1>
        <button onClick={exportPDF} disabled={isExporting || loading} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold flex gap-2 hover:bg-red-700 disabled:opacity-50">
            {isExporting ? <Loader2 className="animate-spin"/> : <FileDown />} Export PDF
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex gap-4 flex-wrap items-end">
        <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Start Date</label>
            <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="border p-2 rounded-lg text-sm focus:ring-[#002D72]" />
        </div>
        <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">End Date</label>
            <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="border p-2 rounded-lg text-sm focus:ring-[#002D72]" />
        </div>
        <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Department</label>
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="border p-2 rounded-lg w-40 text-sm">
                <option value="All">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
        </div>
        <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 mb-1">Employee Name</label>
            <select value={filterName} onChange={e => setFilterName(e.target.value)} className="border p-2 rounded-lg w-full text-sm">
                <option value="All">-- All Employees --</option>
                {employees
                    .filter(e => filterDept === 'All' || e.department === filterDept)
                    .map(emp => (
                        <option key={emp.id} value={emp.name}>{emp.name}</option>
                    ))
                }
            </select>
        </div>
      </div>

      {/* --- 1. SUMMARY TABLE --- */}
      <div className="bg-white rounded-xl shadow-sm mb-8 overflow-hidden border border-gray-200">
        <div className="p-4 bg-gray-50 border-b font-bold text-[#002D72] flex items-center gap-2">
            <LayoutList className="w-5 h-5"/> 1. Summary View
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-[#FA4786] text-white uppercase text-xs">
                    <tr>
                        <th className="p-3">ID</th><th className="p-3">Name</th><th className="p-3">Dept</th>
                        <th className="p-3 text-center">Total</th><th className="p-3 text-center">Present</th>
                        <th className="p-3 text-center">On Time</th>
                        <th className="p-3 text-center">Absent</th><th className="p-3 text-center">Late</th>
                        <th className="p-3 text-center">Left Early</th>
                        <th className="p-3 text-center">Late & Left Early</th>
                        <th className="p-3 text-center">Manual</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {loading ? <tr><td colSpan="11" className="p-6 text-center">Loading data...</td></tr> : summary.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                            <td className="p-3 font-mono">{row.person_id}</td>
                            <td className="p-3 font-bold">{row.name}</td>
                            <td className="p-3">{row.department}</td>
                            <td className="p-3 text-center">{row.total_days}</td>
                            <td className="p-3 text-center text-green-600 font-bold">{row.present}</td>
                            <td className="p-3 text-center text-green-600">{row.on_time}</td>
                            <td className="p-3 text-center text-red-600">{row.absent}</td>
                            <td className="p-3 text-center text-orange-500">{row.late}</td>
                            <td className="p-3 text-center text-orange-500">{row.leave_early}</td>
                            <td className="p-3 text-center text-red-600 font-bold">{row.both}</td>
                            <td className="p-3 text-center font-bold text-blue-600">{row.manual_edit_count}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* --- 2. BREAKDOWN TABLE --- */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 mt-8">
        <div className="p-4 bg-gray-50 border-b font-bold text-[#002D72] flex items-center gap-2">
            <FileText className="w-5 h-5"/> 2. Daily Breakdown
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-[#002D72] text-white uppercase text-xs">
                    <tr>
                        <th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Flag</th>
                        <th className="p-3">Name</th><th className="p-3">Shift</th><th className="p-3">Actual</th><th className="p-3">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {loading ? <tr><td colSpan="7" className="p-6 text-center">Loading...</td></tr> : breakdown.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                            <td className="p-3 whitespace-nowrap">{row.date}</td>
                            <td className={`p-3 text-xs font-bold ${row.day_type.includes('Holiday') ? 'text-red-600' : row.day_type === 'Weekend' ? 'text-gray-400' : 'text-gray-700'}`}>{row.day_type}</td>
                            <td className="p-3">{row.flag === 'Auto' ? <span className="text-gray-400 text-xs">Auto</span> : <span className="text-xs font-bold px-2 py-1 rounded bg-orange-100 text-orange-700">Manual</span>}</td>
                            <td className="p-3 font-medium">{row.name}</td>
                            <td className="p-3 text-xs">{row.shift_in} - {row.shift_out}</td>
                            <td className="p-3 text-xs font-bold text-gray-700">{row.actual_range}</td>
                            <td className="p-3 text-xs">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                                    row.status === 'On Time' ? 'bg-green-100 text-green-700' : 
                                    row.status.includes('Late') || row.status.includes('Early') ? 'bg-orange-100 text-orange-700' : 
                                    row.status === 'Absent' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                                }`}>
                                    {row.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default DetailsPage;