import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, Lock, Mail, Phone, User, Shield, Check, X, Church, Key } from 'lucide-react';
import { api, setStoredUserId } from '../lib/api';
import { User as UserType } from '../types';

interface AuthPageProps {
  onAuthSuccess: (user: UserType) => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'parent' | 'teacher' | 'admin'>('parent');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Forgot password flow states
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [receivedCode, setReceivedCode] = useState(''); // Simulated email delivery

  // Password Rules validation
  const passToValidate = isLogin ? '' : isForgot ? newPassword : password;
  const hasMinLength = passToValidate.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(passToValidate);
  const hasNumber = /[0-9]/.test(passToValidate);
  const isPasswordValid = hasMinLength && hasLetter && hasNumber;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const user = await api.post<UserType>('/api/auth/login', { email, password });
      setStoredUserId(user.id);
      onAuthSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!isPasswordValid) {
      setError('Password does not meet the safety requirements.');
      return;
    }

    try {
      const user = await api.post<UserType>('/api/auth/register', {
        email,
        phone,
        fullName,
        password,
        role
      });
      
      if (user.approvalStatus === 'approved') {
        setMessage('Registration successful! First administrator account automatically approved.');
        setStoredUserId(user.id);
        setTimeout(() => {
          onAuthSuccess(user);
        }, 1500);
      } else {
        setMessage('Registration submitted! Your account is pending admin approval.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const res = await api.post<{ success: boolean; code: string; message: string }>(
        '/api/auth/reset-password-request',
        { email }
      );
      setReceivedCode(res.code);
      setMessage(`A one-time code was sent to your email. (Simulated delivery: ${res.code})`);
      setForgotStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset.');
    }
  };

  const handleForgotConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!newPassword || !resetCode) {
      setError('Verification code and new password are required.');
      return;
    }

    if (!isPasswordValid) {
      setError('New password must meet safety requirements.');
      return;
    }

    try {
      await api.post('/api/auth/reset-password-confirm', {
        email,
        resetCode,
        newPassword
      });
      setMessage('Password updated successfully! You can now log in.');
      setIsForgot(false);
      setIsLogin(true);
      setForgotStep(1);
      setResetCode('');
      setNewPassword('');
    } catch (err: any) {
      setError(err.message || 'Verification failed. Incorrect code.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-md text-white">
            <Church className="w-10 h-10" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">
          PCEA St Andrew's Church
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 font-medium">
          Sunday School Attendance & Child Check-In
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm rounded-2xl border border-slate-100 sm:px-10">
          
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700 text-sm flex items-start gap-2">
              <X className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-4 bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded text-emerald-700 text-sm flex items-start gap-2">
              <Check className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          {/* SIMULATED RESET CODE BANNER */}
          {receivedCode && isForgot && forgotStep === 2 && (
            <div className="mb-6 bg-amber-50 border-2 border-dashed border-amber-400 p-4 rounded-xl text-amber-950 text-sm">
              <p className="font-bold flex items-center gap-1 text-amber-800">
                <Key className="w-4 h-4" /> [Simulated Inbox] One-Time Reset Code:
              </p>
              <p className="text-xl font-mono tracking-widest mt-1 text-center bg-white py-2 rounded border border-amber-200">
                {receivedCode}
              </p>
              <p className="text-xs text-amber-700 mt-1.5">
                Use this security verification code to complete the reset.
              </p>
            </div>
          )}

          {/* FORGOT PASSWORD FORM */}
          {isForgot ? (
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                {forgotStep === 1 ? 'Reset Password' : 'Verify & Enter New Password'}
              </h3>
              
              {forgotStep === 1 ? (
                <form onSubmit={handleForgotRequest} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Email Address</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-5 h-5" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="parent@example.com"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <button
                      type="button"
                      onClick={() => setIsForgot(false)}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-500"
                    >
                      Back to login
                    </button>
                    <button
                      type="submit"
                      className="inline-flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Send reset code
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleForgotConfirm} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Verification Code</label>
                    <input
                      type="text"
                      required
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono text-center tracking-widest text-lg"
                      placeholder="XXXXXX"
                      maxLength={6}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">New Password</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="block w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Minimum 8 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Live Password Rules */}
                  <div className="bg-slate-50 p-3 rounded-lg space-y-1.5 text-xs text-slate-600">
                    <p className="font-semibold text-slate-700">Password Safety Requirements:</p>
                    <div className="flex items-center gap-1.5">
                      {hasMinLength ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-red-400" />}
                      <span>Minimum 8 characters</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasLetter ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-red-400" />}
                      <span>At least one letter</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-red-400" />}
                      <span>At least one number</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-500"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={!isPasswordValid}
                      className="inline-flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                      Update Password
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div>
              {/* LOGIN OR SIGNUP FORM */}
              <div className="flex justify-center space-x-4 mb-6 border-b border-slate-100 pb-4">
                <button
                  type="button"
                  onClick={() => { setIsLogin(true); setError(''); setMessage(''); }}
                  className={`text-sm font-semibold pb-2 border-b-2 px-4 transition-colors ${
                    isLogin ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => { setIsLogin(false); setError(''); setMessage(''); }}
                  className={`text-sm font-semibold pb-2 border-b-2 px-4 transition-colors ${
                    !isLogin ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
                {!isLogin && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Full Name</label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <User className="w-5 h-5" />
                        </div>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="John Doe"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700">Phone Number</label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Phone className="w-5 h-5" />
                        </div>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="0712345678"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700">Role</label>
                      <div className="mt-1 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setRole('parent')}
                          className={`py-2 text-center text-xs font-semibold rounded-lg border transition-colors ${
                            role === 'parent'
                              ? 'bg-blue-50 border-blue-500 text-blue-700'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Parent
                        </button>
                        <button
                          type="button"
                          onClick={() => setRole('teacher')}
                          className={`py-2 text-center text-xs font-semibold rounded-lg border transition-colors ${
                            role === 'teacher'
                              ? 'bg-blue-50 border-blue-500 text-blue-700'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Teacher
                        </button>
                        <button
                          type="button"
                          onClick={() => setRole('admin')}
                          className={`py-2 text-center text-xs font-semibold rounded-lg border transition-colors ${
                            role === 'admin'
                              ? 'bg-blue-50 border-blue-500 text-blue-700'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Admin
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {role === 'admin' && 'Note: Limit of 5 admins maximum. First user is approved automatically.'}
                        {role === 'teacher' && 'Teachers verify pickup codes and log Sunday classes.'}
                        {role === 'parent' && 'Parents register children, request daily check-ins, and view scores.'}
                      </p>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700">Email Address</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="parent@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Checklist (Register Mode Only) */}
                {!isLogin && (
                  <div className="bg-slate-50 p-3 rounded-lg space-y-1.5 text-xs text-slate-600">
                    <p className="font-semibold text-slate-700">Password Safety Requirements:</p>
                    <div className="flex items-center gap-1.5">
                      {hasMinLength ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-red-400" />}
                      <span>Minimum 8 characters</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasLetter ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-red-400" />}
                      <span>At least one letter</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-red-400" />}
                      <span>At least one number</span>
                    </div>
                  </div>
                )}

                {isLogin && (
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => { setIsForgot(true); setForgotStep(1); }}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-500"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={!isLogin && !isPasswordValid}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-150"
                  >
                    {isLogin ? 'Log In' : 'Sign Up'}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
