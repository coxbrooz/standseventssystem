import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Church, Loader2, Key, HelpCircle } from 'lucide-react';
import { api, getStoredUserId, setStoredUserId } from './lib/api';
import { User } from './types';
import AuthPage from './components/AuthPage';
import PendingApproval from './components/PendingApproval';
import ParentDashboard from './components/ParentDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [sysError, setSysError] = useState('');

  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    const token = getStoredUserId();
    if (!token) {
      setCheckingAuth(false);
      return;
    }

    try {
      const currentUser = await api.get<User>('/api/auth/me');
      setUser(currentUser);
    } catch (err: any) {
      console.warn('Session check failed or expired:', err.message);
      // Clear token to allow clean logging in
      setStoredUserId(null);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
  };

  const handleLogout = () => {
    setStoredUserId(null);
    setUser(null);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center space-y-4"
        >
          <div className="bg-blue-600 p-4 rounded-3xl text-white inline-block shadow-md shadow-blue-600/10 animate-bounce">
            <Church className="w-12 h-12" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">PCEA St Andrew's</h1>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Securing Sunday School Check-ins</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-slate-500 text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Establishing secure database session...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // Auth Guard
  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <AuthPage onAuthSuccess={handleAuthSuccess} />
      </motion.div>
    );
  }

  // Pending approval screen (except for first auto-approved admin or any approved profile)
  if (user.approvalStatus !== 'approved') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <PendingApproval user={user} onLogout={handleLogout} />
      </motion.div>
    );
  }

  // Approved views based on church roles
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen bg-slate-50"
    >
      {user.role === 'admin' && (
        <AdminDashboard user={user} onLogout={handleLogout} />
      )}
      
      {user.role === 'teacher' && (
        <TeacherDashboard user={user} onLogout={handleLogout} />
      )}
      
      {user.role === 'parent' && (
        <ParentDashboard user={user} onLogout={handleLogout} />
      )}
    </motion.div>
  );
}
