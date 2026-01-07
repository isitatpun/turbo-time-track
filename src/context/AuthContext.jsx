import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check Session on Load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        checkVerificationAndSetUser(session.user);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        checkVerificationAndSetUser(session.user);
      } else {
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- GATEKEEPER FUNCTION (UPDATED) ---
  const checkVerificationAndSetUser = async (authUser) => {
    try {
      // 1. ดึงข้อมูล (ใช้ maybeSingle เพื่อไม่ให้ Error แดงถ้ายัังไม่มีข้อมูล)
      const { data, error } = await supabase
        .schema('facility_management')
        .from('user_roles')
        .select('role, is_verified')
        .eq('id', authUser.id)
        .maybeSingle();

      // ถ้า error จริงๆ (ไม่ใช่แค่หาไม่เจอ) ให้ log
      if (error && error.code !== 'PGRST116') {
         console.error("DB Read Error:", error);
      }

      // --- กรณี: ยังไม่มีข้อมูลในตาราง user_roles ---
      if (!data) {
        console.log("New user detected. Checking domain for SSO...");

        // ตรวจสอบ Domain (@turbo.co.th)
        const email = authUser.email || '';
        if (!email.endsWith('@turbo.co.th')) {
          await supabase.auth.signOut();
          alert("Access Denied: Only @turbo.co.th accounts are allowed.");
          return;
        }

        // 2. สร้างข้อมูลด้วย UPSERT (แก้ปัญหา Duplicate Key)
        try {
          const { data: newUser, error: insertError } = await supabase
            .schema('facility_management')
            .from('user_roles')
            .upsert(
              { 
                id: authUser.id, 
                email: email,
                role: 'user',        
                is_verified: true    
              },
              { onConflict: 'id', ignoreDuplicates: false } // ทับข้อมูลเดิมไปเลยถ้ามีปัญหาค้างเก่า
            )
            .select()
            .single();

          if (insertError) throw insertError;

          // 3. Set State (Success)
          setUser(authUser);
          setRole(newUser?.role || 'user');

        } catch (err) {
          console.error("Auto-create failed:", err);
          await supabase.auth.signOut();
          alert("Login failed due to system error. Please try again.");
        }
        return;
      }

      // --- กรณี: มีข้อมูลอยู่แล้ว ---
      if (data.is_verified) {
        setUser(authUser);
        setRole(data.role || 'user');
      } else {
        await supabase.auth.signOut();
        alert("Your account is pending approval.\nPlease contact the Master Admin.");
      }
    } catch (err) {
      console.error("Auth Check Critical Error:", err);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  // Login ด้วย Google
  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin, 
        queryParams: {
            access_type: 'offline',
            prompt: 'consent',
        }
      }
    });
    if (error) throw error;
  };

  const login = (email, password) => supabase.auth.signInWithPassword({ email, password });
  const logout = () => supabase.auth.signOut();
  
  const register = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.user) await supabase.auth.signOut();
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, role, login, loginWithGoogle, logout, register, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};