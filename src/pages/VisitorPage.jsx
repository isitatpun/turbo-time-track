import React, { useState, useEffect, useMemo } from 'react';
import { getVisitorLogsService } from '../lib/services';
import { 
  Calendar, Filter, User, Briefcase, Search, Loader2, AlertCircle, 
  LayoutGrid, Table as TableIcon, PieChart as PieChartIcon 
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

// --- Extended Palette for many categories ---
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#FA4786', 
  '#002D72', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1',
  '#a4de6c', '#d0ed57', '#f06b6b', '#2c3e50', '#e67e22'
];

export default function VisitorPage() {
  // --- States ---
  const [loading, setLoading] = useState(false);
  const [visitors, setVisitors] = useState([]);
  const [error, setError] = useState('');

  // 1. Global Filter (Year & Month)
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // 2. View Mode State
  const [summaryView, setSummaryView] = useState('chart');

  // 3. Detail Filters
  const [filterPurpose, setFilterPurpose] = useState('All');
  const [filterHost, setFilterHost] = useState('All');

  // --- Date Validation & Fetch Logic ---
  useEffect(() => {
    const fetchData = async () => {
      setError('');
      setVisitors([]); 

      // --- Validation Logic ---
      
      // 1. Min Date: Dec 1, 2025
      const minRequiredDate = new Date(2025, 11, 1); 
      const selectedDateStart = new Date(selectedYear, selectedMonth - 1, 1);
      
      // 2. Max Date: Current Month (Real-time)
      const maxAllowedDate = new Date(currentYear, currentMonth - 1, 1);

      if (selectedDateStart < minRequiredDate) {
        setError('Data is only available from December 2025 onwards.');
        return;
      }
      
      // Strict check: selected month cannot be in the future
      if (selectedDateStart > maxAllowedDate) {
        setError('Cannot select a future month.');
        return;
      }

      setLoading(true);
      try {
        const lastDayOfSelectedMonth = new Date(selectedYear, selectedMonth, 0);
        const strMonth = String(selectedMonth).padStart(2, '0');
        const startDate = `${selectedYear}-${strMonth}-01`;
        const endDate = `${selectedYear}-${strMonth}-${lastDayOfSelectedMonth.getDate()}`;

        const data = await getVisitorLogsService(startDate, endDate);
        setVisitors(data);
      } catch (err) {
        console.error("Error fetching visitors:", err);
        setError('Failed to load visitor data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedYear, selectedMonth, currentYear, currentMonth]);

  // --- AGGREGATION LOGIC ---
  const summaryData = useMemo(() => {
    const totalCount = visitors.length;
    const grouped = visitors.reduce((acc, curr) => {
      const purpose = curr.visit_purpose || 'Unknown';
      if (!acc[purpose]) acc[purpose] = 0;
      acc[purpose]++;
      return acc;
    }, {});

    return Object.keys(grouped).map(key => ({
      name: key,
      value: grouped[key],
      percentage: totalCount > 0 ? ((grouped[key] / totalCount) * 100).toFixed(1) : 0
    })).sort((a, b) => b.value - a.value);
  }, [visitors]);

  const stats = useMemo(() => ({
    total: visitors.length,
    topPurpose: summaryData.length > 0 ? summaryData[0].name : '-',
    uniqueHosts: new Set(visitors.map(v => v.host)).size
  }), [visitors, summaryData]);

  // --- DETAIL FILTER LOGIC ---
  const uniqueHosts = useMemo(() => [...new Set(visitors.map(v => v.host).filter(Boolean))].sort(), [visitors]);
  const uniquePurposes = useMemo(() => [...new Set(visitors.map(v => v.visit_purpose).filter(Boolean))].sort(), [visitors]);

  const filteredDetails = visitors.filter(v => {
    const matchPurpose = filterPurpose === 'All' || v.visit_purpose === filterPurpose;
    const matchHost = filterHost === 'All' || v.host === filterHost;
    return matchPurpose && matchHost;
  });

  // --- DYNAMIC OPTIONS HELPERS ---
  
  // Year Options: From 2025 up to Current Real Year
  const startYear = 2025;
  const yearOptions = Array.from(
    { length: currentYear - startYear + 1 }, 
    (_, i) => startYear + i
  );

  // Month Options: Standard 1-12
  const monthOptions = [
    { val: 1, label: 'January' }, { val: 2, label: 'February' }, { val: 3, label: 'March' },
    { val: 4, label: 'April' }, { val: 5, label: 'May' }, { val: 6, label: 'June' },
    { val: 7, label: 'July' }, { val: 8, label: 'August' }, { val: 9, label: 'September' },
    { val: 10, label: 'October' }, { val: 11, label: 'November' }, { val: 12, label: 'December' }
  ];

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen font-sans">
      
      {/* --- Header --- */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-[#002D72] flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-[#FA4786]" />
            Visitor Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">Monthly tracking and analysis</p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          {error && (
            <div className="flex items-center gap-1 text-red-600 text-xs font-medium animate-pulse">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <div className={`flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border ${error ? 'border-red-300' : 'border-gray-200'}`}>
            <Calendar className="w-4 h-4 text-gray-500 ml-2" />
            <span className="text-xs font-bold text-gray-500 mr-2">Period:</span>
            
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-white border border-gray-200 text-gray-700 text-sm rounded-md focus:ring-blue-500 block p-1.5 cursor-pointer outline-none shadow-sm"
            >
              {monthOptions.map((m) => (
                <option 
                  key={m.val} 
                  value={m.val}
                  // Optional: Disable future months in current year
                  disabled={selectedYear === currentYear && m.val > currentMonth}
                  className={selectedYear === currentYear && m.val > currentMonth ? 'text-gray-300' : ''}
                >
                  {m.label}
                </option>
              ))}
            </select>

            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white border border-gray-200 text-gray-700 text-sm rounded-md focus:ring-blue-500 block p-1.5 cursor-pointer outline-none font-bold shadow-sm"
            >
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center bg-white rounded-xl shadow-sm">
          <Loader2 className="w-10 h-10 text-[#002D72] animate-spin" />
        </div>
      ) : error ? (
         <div className="h-96 flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
            <AlertCircle className="w-12 h-12 mb-3 opacity-30" />
            <p>{error}</p>
         </div>
      ) : (
        <>
          {/* ================= PART 1: BEAUTIFIED SUMMARY VIEW ================= */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
              <h2 className="text-lg font-bold text-gray-800">Monthly Summary</h2>
              
              <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
                <button onClick={() => setSummaryView('chart')} className={`p-1.5 rounded-md transition-all ${summaryView === 'chart' ? 'bg-white shadow text-[#002D72]' : 'text-gray-400 hover:text-gray-600'}`} title="Graph View"><PieChartIcon size={18} /></button>
                <button onClick={() => setSummaryView('cards')} className={`p-1.5 rounded-md transition-all ${summaryView === 'cards' ? 'bg-white shadow text-[#002D72]' : 'text-gray-400 hover:text-gray-600'}`} title="Card View"><LayoutGrid size={18} /></button>
                <button onClick={() => setSummaryView('table')} className={`p-1.5 rounded-md transition-all ${summaryView === 'table' ? 'bg-white shadow text-[#002D72]' : 'text-gray-400 hover:text-gray-600'}`} title="Table View"><TableIcon size={18} /></button>
              </div>
            </div>
            
            <div className="p-6">
               {/* VIEW 1: CHART */}
               {summaryView === 'chart' && (
                 <div className="flex flex-col md:flex-row h-[400px] w-full items-center">
                    <div className="w-full md:w-1/2 h-full relative flex items-center justify-center">
                      {summaryData.length > 0 ? (
                        <>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={summaryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={90}
                                outerRadius={130}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                              >
                                {summaryData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip 
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                itemStyle={{ color: '#374151', fontWeight: 600 }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-4xl font-extrabold text-[#002D72]">{stats.total}</span>
                            <span className="text-sm text-gray-500 font-medium uppercase tracking-wide mt-1">Visitors</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-gray-400">No data available</div>
                      )}
                    </div>

                    <div className="w-full md:w-1/2 h-full md:pl-8 mt-6 md:mt-0">
                      <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 sticky top-0 bg-white py-2">
                          Breakdown by Purpose
                        </h3>
                        <div className="space-y-3">
                          {summaryData.map((item, index) => (
                            <div key={index} className="flex items-center justify-between group hover:bg-gray-50 p-2 rounded-lg transition-colors cursor-default">
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                <span className="text-sm text-gray-700 font-medium truncate max-w-[200px]" title={item.name}>{item.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-gray-800">{item.value}</span>
                                <span className="text-xs text-gray-400 w-10 text-right">{item.percentage}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                 </div>
               )}

               {/* VIEW 2: CARDS */}
               {summaryView === 'cards' && (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="relative overflow-hidden bg-gradient-to-br from-[#002D72] to-[#004494] text-white p-6 rounded-2xl shadow-lg shadow-blue-900/20">
                       <div className="relative z-10">
                         <p className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-2">Total Visitors</p>
                         <p className="text-5xl font-bold">{stats.total}</p>
                       </div>
                       <Briefcase className="absolute -right-2.5 -bottom-2.5 w-32 h-32 text-white opacity-10" />
                    </div>
                    <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex flex-col justify-center">
                       <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Top Purpose</p>
                       <div className="flex items-center gap-2">
                         <span className="w-2 h-8 bg-[#FA4786] rounded-full"></span>
                         <div>
                            <p className="text-xl font-bold text-gray-800 line-clamp-1" title={stats.topPurpose}>{stats.topPurpose}</p>
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">Most Frequent</span>
                         </div>
                       </div>
                    </div>
                    <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex flex-col justify-center">
                       <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Active Hosts</p>
                       <div className="flex items-center gap-3">
                         <div className="p-3 bg-blue-50 rounded-full text-[#002D72]"><User size={24} /></div>
                         <div>
                            <p className="text-2xl font-bold text-gray-800">{stats.uniqueHosts}</p>
                            <p className="text-xs text-gray-400">Unique employees</p>
                         </div>
                       </div>
                    </div>
                 </div>
               )}

               {/* VIEW 3: TABLE */}
               {summaryView === 'table' && (
                 <div className="overflow-hidden rounded-lg border border-gray-100">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                        <tr>
                          <th className="p-4 border-b">Purpose</th>
                          <th className="p-4 border-b text-center">Count</th>
                          <th className="p-4 border-b text-right">% Distribution</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {summaryData.map((item, idx) => (
                          <tr key={item.name} className="border-b last:border-0 hover:bg-blue-50/20 transition-colors">
                            <td className="p-4 font-medium text-gray-700 flex items-center gap-3">
                               <div className="w-2 h-2 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                               {item.name}
                            </td>
                            <td className="p-4 text-center"><span className="bg-gray-100 text-gray-700 font-bold px-2 py-1 rounded-md text-xs">{item.value}</span></td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${item.percentage}%`, backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                </div>
                                <span className="text-gray-500 text-xs w-10">{item.percentage}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
               )}
            </div>
          </section>

          {/* ================= PART 2: DETAILED LOGS TABLE ================= */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between md:items-center gap-4 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-gray-400" />
                <h2 className="text-base font-bold text-gray-700">Detailed Logs</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-md border border-gray-200 shadow-sm">
                  <span className="text-xs font-bold text-gray-400 uppercase">Purpose</span>
                  <select 
                    value={filterPurpose}
                    onChange={(e) => setFilterPurpose(e.target.value)}
                    className="bg-transparent text-sm text-gray-700 outline-none cursor-pointer border-l pl-2 border-gray-200"
                  >
                    <option value="All">All Purposes</option>
                    {uniquePurposes.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-md border border-gray-200 shadow-sm">
                  <span className="text-xs font-bold text-gray-400 uppercase">Host</span>
                  <select 
                    value={filterHost}
                    onChange={(e) => setFilterHost(e.target.value)}
                    className="bg-transparent text-sm text-gray-700 outline-none cursor-pointer border-l pl-2 border-gray-200 max-w-[150px]"
                  >
                    <option value="All">All Hosts</option>
                    {uniqueHosts.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4">Visitor</th>
                    <th className="p-4">Purpose</th>
                    <th className="p-4">Host</th>
                    <th className="p-4 text-right">Time In</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {filteredDetails.length > 0 ? (
                    filteredDetails.map((v, i) => (
                      <tr key={v.id || i} className="hover:bg-blue-50/40 transition-colors group">
                        <td className="p-4 text-gray-500 font-mono text-xs">{v.date_entry}</td>
                        <td className="p-4 font-bold text-gray-800">{v.visitor_name}</td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium border border-gray-200 group-hover:bg-white group-hover:border-blue-200 group-hover:text-blue-700 transition-all">
                            {v.visit_purpose}
                          </span>
                        </td>
                        <td className="p-4 text-gray-600">
                          <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{v.host ? v.host.charAt(0) : '-'}</div>
                             {v.host || '-'}
                          </div>
                        </td>
                        <td className="p-4 text-gray-400 text-xs text-right font-mono">
                           {v.first_entry_time 
                             ? new Date(v.first_entry_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) 
                             : '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="p-12 text-center text-gray-400 bg-gray-50/30">No visitor records found matching your filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}