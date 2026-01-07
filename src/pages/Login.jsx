import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase'; // Make sure this path is correct for your project

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '' });
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();
  
  // Destructure logout to kick out unapproved users
  const { login, register, loginWithGoogle, logout } = useAuth(); 

  // --- 1. Handle Google Login ---
  const handleGoogleSignIn = async () => {
    try {
        setError('');
        await loginWithGoogle();
    } catch (err) {
        setError(err.message);
    }
  };

  // --- 2. Handle Email/Password Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isRegistering) {
        // --- REGISTER FLOW ---
        if (formData.password !== formData.confirmPassword) {
            throw new Error("Passwords do not match.");
        }
        
        // 1. Register the user in Supabase Auth
        const { data: authData, error: authError } = await register(formData.email, formData.password);
        if (authError) throw authError;

        // 2. (Optional) Create entry in user_roles if your Database Trigger doesn't do it automatically.
        // If you have a Trigger, skip this. If not, uncomment below:
        /*
        await supabase.from('user_roles').insert([
          { id: authData.user.id, email: formData.email, role: 'user', is_verified: false }
        ]);
        */
        
        alert("Registration successful!\n\nPlease wait for Master Admin to verify your account.");
        setIsRegistering(false);
        setFormData({ email: '', password: '', confirmPassword: '' });

      } else {
        // --- LOGIN FLOW ---
        
        // 1. Perform Authentication (Check Email/Password)
        const { data, error: loginError } = await login(formData.email, formData.password);
        if (loginError) throw loginError;
        
        if (data?.user) {
            // 2. Perform Authorization (Check is_verified in user_roles)
            // We query the 'user_roles' table matching the Auth ID
            const { data: userRole, error: roleError } = await supabase
                .from('user_roles') // Matches your table name in the screenshot
                .select('is_verified') // Matches your column in the screenshot
                .eq('id', data.user.id) // Assumes user_roles.id is the same as Auth ID
                .single();

            // Handle case where no record exists (optional safety check)
            if (roleError && roleError.code !== 'PGRST116') {
                await logout(); 
                throw new Error("Error verifying account status.");
            }

            // 3. Check the Approval Flag
            // If the record exists but is_verified is FALSE (or NULL)
            if (userRole && userRole.is_verified !== true) {
                // If not verified, force logout immediately
                await logout();
                throw new Error("Access Denied: Your account is waiting for verification from the Master Admin.");
            }
            
            // If userRole doesn't exist yet (rare case if triggers fail), you might want to block or allow depending on logic.
            // Strict security usually blocks:
            if (!userRole) {
                 await logout();
                 throw new Error("Account setup incomplete. Contact Admin.");
            }
        }

        // 4. Success: User is Authenticated AND Verified
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      if (err.message && err.message.includes("Invalid login credentials")) {
        setError("Invalid email or password.");
      } else {
        setError(err.message || "An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#002D72]">Clockin System</h1>
          <p className="text-gray-500 mt-2">
            {isRegistering ? "Create New Account" : "Sign in to Dashboard"}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              disabled={isLoading}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#002D72] outline-none transition disabled:bg-gray-100"
              placeholder="name@turbo.co.th"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                disabled={isLoading}
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#002D72] outline-none pr-10 transition disabled:bg-gray-100"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-[#002D72] transition"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {isRegistering && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required={isRegistering}
                  disabled={isLoading}
                  placeholder="••••••••"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#002D72] outline-none pr-10 transition disabled:bg-gray-100"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#002D72] text-white font-bold py-3 rounded-xl hover:bg-[#001f52] transition shadow-lg flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              isRegistering ? "Request Account" : "Sign In"
            )}
          </button>
        </form>

        {!isRegistering && (
            <div className="mt-6">
                <div className="relative flex py-2 items-center">
                    <div className="grow border-t border-gray-200"></div>
                    <span className="shrink-0 mx-4 text-gray-400 text-xs">OR</span>
                    <div className="grow border-t border-gray-200"></div>
                </div>

                <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition shadow-sm mt-2"
                >
                    {/* Google SVG */}
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                </button>
            </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
              setFormData({ email: '', password: '', confirmPassword: '' });
            }}
            disabled={isLoading}
            className="text-sm text-[#002D72] hover:underline font-medium disabled:opacity-50"
          >
            {isRegistering
              ? "Already have an account? Sign In"
              : "Need an account? Register here"}
          </button>
        </div>
        
      </div>
    </div>
  );
}