import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext'; // Import from your Context

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '' });
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();
  
  // Get functions from AuthContext
  const { login, register, loginWithGoogle } = useAuth(); 

  // --- 1. Handle Google Login ---
  const handleGoogleSignIn = async () => {
    try {
        setError('');
        await loginWithGoogle();
        // No need to navigate manually, Supabase handles the redirect
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
        
        await register(formData.email, formData.password);
        
        alert("Registration successful!\n\nPlease wait for Master Admin approval.");
        setIsRegistering(false);
        setFormData({ email: '', password: '', confirmPassword: '' });

      } else {
        // --- LOGIN FLOW ---
        const { error } = await login(formData.email, formData.password);
        if (error) throw error;
        
        // Success: Context detects user change and App.jsx redirects to Dashboard
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
        
        {/* HEADER */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#002D72]">Clockin System</h1>
          <p className="text-gray-500 mt-2">
            {isRegistering ? "Create New Account" : "Sign in to Dashboard"}
          </p>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* EMAIL */}
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

          {/* PASSWORD */}
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

          {/* CONFIRM PASSWORD (Only when Registering) */}
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

          {/* SUBMIT BUTTON */}
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

        {/* --- GOOGLE SIGN IN BUTTON (Only for Login Mode) --- */}
        {!isRegistering && (
            <div className="mt-6">
                <div className="relative flex py-2 items-center">
                    {/* FIXED: Updated Tailwind classes (grow, shrink-0) to fix warnings */}
                    <div className="grow border-t border-gray-200"></div>
                    <span className="shrink-0 mx-4 text-gray-400 text-xs">OR</span>
                    <div className="grow border-t border-gray-200"></div>
                </div>

                <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition shadow-sm mt-2"
                >
                    {/* Google SVG Icon */}
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                    </svg>
                    Continue with Google
                </button>
            </div>
        )}

        {/* TOGGLE LOGIN / REGISTER */}
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