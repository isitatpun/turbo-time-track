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

  // --- GATEKEEPER FUNCTION (STRICT APPROVAL MODE) ---
  const checkVerificationAndSetUser = async (authUser) => {
    try {
      // 1. Check if user exists in DB
      const { data, error } = await supabase
        .schema('facility_management')
        .from('user_roles')
        .select('role, is_verified')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
          console.error("DB Read Error:", error);
      }

      // --- CASE 1: New User (First time login) ---
      if (!data) {
        console.log("New user detected. Creating PENDING profile...");

        // Optional: Keep domain check if you want to restrict who can request access
        const email = authUser.email || '';
        if (!email.endsWith('@turbo.co.th')) {
          await supabase.auth.signOut();
          alert("Access Denied: Only @turbo.co.th accounts are allowed.");
          return;
        }

        // 2. Create Profile with FALSE verification
        try {
          const { error: insertError } = await supabase
            .schema('facility_management')
            .from('user_roles')
            .upsert(
              { 
                id: authUser.id, 
                email: email,
                role: 'user',        
                is_verified: false  // <--- CHANGED: Default is now FALSE for everyone
              },
              { onConflict: 'id', ignoreDuplicates: false } 
            );

          if (insertError) throw insertError;

          // 3. FORCE LOGOUT IMMEDIATELY
          // Even if Google login was successful, we kick them out here because they are not verified.
          await supabase.auth.signOut();
          
          alert("Registration successful!\n\nYour account is pending approval. Please contact the Master Admin to activate your account.");
          
          // Ensure state is clear
          setUser(null);
          setRole(null);

        } catch (err) {
          console.error("Auto-create failed:", err);
          await supabase.auth.signOut();
          alert("Login failed due to system error. Please try again.");
        }
        return;
      }

      // --- CASE 2: Existing User ---
      if (data.is_verified) {
        // User is Approved -> Let them in
        setUser(authUser);
        setRole(data.role || 'user');
      } else {
        // User exists but is NOT Approved -> Kick them out
        await supabase.auth.signOut();
        alert("Access Denied: Your account is still pending approval.\nPlease contact the Master Admin.");
        setUser(null);
        setRole(null);
      }
    } catch (err) {
      console.error("Auth Check Critical Error:", err);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  // Login with Google
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