// src/lib/services.js

// ==============================================================================
// 1. IMPORT THE CLIENT (Do not create it here)
// ==============================================================================
import { supabase } from './supabase'; 

// ==========================================
// 1. Employee Management Services
// ==========================================

// Fetch ALL Employees (for EmployeePage.jsx list & Dropdowns)
export const getAllEmployeesService = async () => {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('name'); 
  
  if (error) throw error;
  return data;
};

// Fetch Active Employees for a specific date (for Dashboard.jsx)
export const getActiveEmployeesService = async (dateString) => {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    // 1. MUST have an effective date (Exclude NULLs)
    .not('effective_date', 'is', null) 
    // 2. Started BEFORE or ON the selected date
    .lte('effective_date', dateString)
    // 3. Has NOT resigned OR Resigned AFTER the selected date
    .or(`resignation_date.is.null,resignation_date.gte.${dateString}`);

  if (error) {
    console.error('Error fetching active employees:', error);
    return [];
  }
  return data;
};

// Update Employee (Edit Dates/Details)
export const updateEmployeeService = async (id, updates) => {
  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data;
};

// Add New Employee
export const addEmployeeService = async (employee) => {
  const { data, error } = await supabase
    .from('employees')
    .insert([employee])
    .select();

  if (error) throw error;
  return data;
};

// ==========================================
// 2. Log & Attendance Services
// ==========================================

// Fetch Logs (Merged Raw + Manual)
export const fetchLogs = async (startDate, endDate) => {
  // A. Fetch Hardware Scans
  const { data: rawData, error: rawError } = await supabase
    .from('door3_raw')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);

  if (rawError) throw rawError;

  // B. Fetch Manual Edits
  const { data: manualData, error: manualError } = await supabase
    .from('door3_manual_edits')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);

  if (manualError) throw manualError;

  // C. Normalize and Merge Data
  const formattedLogs = rawData.map(log => ({
    id: log.id,
    person_no: log.person_no,
    date: log.date,
    checkIn: log.full_entry_timestamp,
    checkOut: log.full_exit_timestamp,
    source: 'device'
  }));

  const formattedManual = manualData.map(log => ({
    id: `manual-${log.id}`,
    person_no: log.person_no,
    date: log.date,
    checkIn: log.manual_entry_timestamp,
    checkOut: log.manual_exit_timestamp,
    reason: log.edit_reason,
    source: 'manual',
    updated_by: log.updated_by
  }));

  return [...formattedLogs, ...formattedManual];
};

// Add Manual Entry (Correction)
export const addManualEntry = async (entryData) => {
  const { data, error } = await supabase
    .from('door3_manual_edits')
    .insert([entryData])
    .select();

  if (error) throw error;
  return data;
};

// ==========================================
// 3. Shift Services
// ==========================================

// Fetch Shifts for Calculations (DetailsPage.jsx)
export const fetchShifts = async (startDate, endDate) => {
  const { data, error } = await supabase
    .from('shifts') 
    .select('*')
    .lte('active_date', endDate)
    .or(`expiry_date.is.null,expiry_date.gte.${startDate}`);

  if (error) {
    console.warn("Shifts table not found or error:", error); 
    return []; 
  }
  return data;
};

// Fetch All Shifts with Employee Names (ShiftPage.jsx)
export const getAllShiftsService = async () => {
  const { data, error } = await supabase
    .from('shifts')
    .select(`
      *,
      employees ( name, department, person_id )
    `)
    .order('active_date', { ascending: false });

  if (error) throw error;
  
  // Flatten structure for UI
  return data.map(s => ({
    ...s,
    name: s.employees?.name,
    department: s.employees?.department,
    person_id: s.employees?.person_id
  }));
};

// [UPDATED] Check Overlap Logic
export const checkShiftOverlapService = async (empId, startDate, endDate, newStart, newEnd, excludeId = null) => {
  let query = supabase
    .from('shifts')
    .select('id')
    .eq('employee_id', empId)
    // Date Overlap Logic: (StartA <= EndB) AND (EndA >= StartB)
    .lte('active_date', endDate || '2099-12-31') 
    .or(`expiry_date.is.null,expiry_date.gte.${startDate}`);

  // If editing, exclude the current shift ID from the check
  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  return data.length > 0; 
};

// Add Shift
export const addShiftService = async (shiftData) => {
  const { data, error } = await supabase
    .from('shifts')
    .insert([shiftData])
    .select();

  if (error) throw error;
  return data;
};

// Update Shift (New Function for Edit)
export const updateShiftService = async (id, shiftData) => {
  const { data, error } = await supabase
    .from('shifts')
    .update(shiftData)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data;
};

// ==========================================
// 4. Date Dimension (Holidays)
// ==========================================

export const fetchDateDim = async (startDate, endDate) => {
  const { data, error } = await supabase
    .from('date_dim')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) throw error;
  return data;
};

// ==========================================
// 5. Auth & User Services
// ==========================================

// Login Service
export const loginService = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

// Register Service (Handles Auth + DB Insert)
export const registerService = async (email, password) => {
  // 1. Sign up in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) throw authError;

  // 2. Insert into 'user_roles' (Schema is auto-handled by createClient config)
  if (authData.user) {
    const { error: dbError } = await supabase
      .from('user_roles')
      .insert([
        { 
          id: authData.user.id, 
          email: email, 
          role: 'admin', // Default role
          is_verified: false // Default status
        }
      ]);
    
    if (dbError) {
      // Cleanup: Optional - verify if you want to delete the auth user if DB fails
      console.error("Database Error:", dbError);
      throw new Error("Account created but failed to set profile. Please contact IT.");
    }
  }

  return authData;
};

// Check User Role & Verification
export const getUserRoleService = async (userId) => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('is_verified, role')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

// Logout Service
export const logoutService = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// ==========================================
// 6. Visitor Services (THIS WAS MISSING OR NOT SAVED)
// ==========================================

export const getVisitorLogsService = async (startDate, endDate) => {
  const { data, error } = await supabase
    .from('visitor')
    .select('*')
    .gte('date_entry', startDate)
    .lte('date_entry', endDate)
    .order('date_entry', { ascending: false });

  if (error) throw error;
  return data;
};