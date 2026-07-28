import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  CheckCircle,
  XCircle,
  Calendar,
  Key,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  LogOut,
  Clock,
  User,
  Plus,
  ArrowRight,
  ListFilter
} from 'lucide-react';
import { api } from '../lib/api';
import { User as UserType, Child, Class, Attendance, CheckIn } from '../types';

interface TeacherDashboardProps {
  user: UserType;
  onLogout: () => void;
}

type TabType = 'my_classes' | 'attendance' | 'pickup_verification';

export default function TeacherDashboard({ user, onLogout }: TeacherDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('my_classes');

  // Data states
  const [classes, setClasses] = useState<Class[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  // Action states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Attendance management states
  const [selectedClassId, setSelectedClassId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<{ [childId: string]: 'present' | 'absent' }>({});

  // Pickup Verification states
  const [verifyChildId, setVerifyChildId] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const [classesData, childrenData, checkInsData, attendanceData] = await Promise.all([
        api.get<Class[]>('/api/classes'),
        api.get<Child[]>('/api/children'),
        api.get<CheckIn[]>('/api/check-ins'),
        api.get<Attendance[]>('/api/attendance')
      ]);

      // Filter classes assigned to this teacher
      const myClasses = classesData.filter(c => c.teacherId === user.id);
      setClasses(myClasses);
      setChildren(childrenData);
      setCheckIns(checkInsData);
      setAttendance(attendanceData);

      if (myClasses.length > 0) {
        setSelectedClassId(myClasses[0].id);
      }
    } catch (err: any) {
      setError('Failed to fetch Sunday School class records.');
    } finally {
      setLoading(false);
    }
  };

  // Pre-populate attendance records when class or date changes
  useEffect(() => {
    if (!selectedClassId) return;

    const classChildren = children.filter(c => c.classId === selectedClassId);
    const records: { [childId: string]: 'present' | 'absent' } = {};

    classChildren.forEach(child => {
      // Check if existing attendance record is logged
      const existing = attendance.find(a => a.childId === child.id && a.date === attendanceDate);
      records[child.id] = existing ? existing.status : 'absent';
    });

    setAttendanceRecords(records);
  }, [selectedClassId, attendanceDate, children, attendance]);

  const toggleAttendance = (childId: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [childId]: prev[childId] === 'present' ? 'absent' : 'present'
    }));
  };

  const handleMarkAllPresent = () => {
    const classChildren = children.filter(c => c.classId === selectedClassId);
    const updated: { [childId: string]: 'present' | 'absent' } = {};
    classChildren.forEach(c => {
      updated[c.id] = 'present';
    });
    setAttendanceRecords(updated);
  };

  const handleSubmitAttendance = async () => {
    if (!selectedClassId) {
      setError('Please select a class first.');
      return;
    }

    setError('');
    setSuccess('');
    const recordsPayload = Object.entries(attendanceRecords).map(([childId, status]) => ({
      childId,
      status
    }));

    try {
      await api.post('/api/attendance/batch', {
        date: attendanceDate,
        classId: selectedClassId,
        records: recordsPayload
      });

      setSuccess(`Attendance logged successfully for ${attendanceDate}!`);
      // Refresh local attendance state
      const refreshedAttendance = await api.get<Attendance[]>('/api/attendance');
      setAttendance(refreshedAttendance);
    } catch (err: any) {
      setError('Failed to save attendance logs.');
    }
  };

  const handleVerifyPickupCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setVerificationResult(null);

    if (!verifyChildId || !enteredCode) {
      setError('Please select a child and enter the 6-digit pickup code.');
      return;
    }

    try {
      const res = await api.post<{ success: boolean; message: string }>('/api/pickup/verify', {
        childId: verifyChildId,
        enteredCode
      });

      setVerificationResult({ success: true, message: res.message });
      setSuccess(res.message);
      setEnteredCode('');
      setVerifyChildId('');

      // Refresh check ins list
      const refreshedCheckIns = await api.get<CheckIn[]>('/api/check-ins');
      setCheckIns(refreshedCheckIns);
    } catch (err: any) {
      setVerificationResult({ success: false, message: err.message || 'Verification failed.' });
      setError(err.message || 'Verification failed. Wrong code.');
    }
  };

  const myClasses = classes;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-xl text-white">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-slate-900 leading-none">PCEA St Andrew's</h1>
                <span className="text-xs text-slate-500 font-semibold tracking-wide uppercase">Teacher Portal</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-800">{user.fullName}</p>
                <p className="text-xs text-slate-500 capitalize">{user.role} Account</p>
              </div>
              <button
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-950 hover:bg-slate-50 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-grow w-full">
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-xl text-red-700 text-sm flex items-start gap-2">
            <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-xl text-emerald-700 text-sm flex items-start gap-2">
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 overflow-x-auto pb-px mb-6 scrollbar-none">
          <button
            onClick={() => { setActiveTab('my_classes'); setError(''); setSuccess(''); }}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'my_classes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" /> My Assigned Classes
          </button>
          <button
            onClick={() => { setActiveTab('attendance'); setError(''); setSuccess(''); }}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'attendance' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar className="w-4 h-4" /> Mark Today's Attendance
          </button>
          <button
            onClick={() => { setActiveTab('pickup_verification'); setError(''); setSuccess(''); setVerificationResult(null); }}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'pickup_verification' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Key className="w-4 h-4" /> Dismissal Pickup Verification
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            <p className="mt-4 text-slate-500 text-sm font-medium">Loading Sunday School classes...</p>
          </div>
        ) : (
          <div>
            {/* TAB 1: MY CLASSES */}
            {activeTab === 'my_classes' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-900 mb-1">Your Assigned Classrooms</h2>
                  <p className="text-xs text-slate-500">Below are classes assigned to you by the Sunday School administration.</p>
                </div>

                {myClasses.length === 0 ? (
                  <div className="bg-white text-center py-12 px-4 rounded-2xl border border-slate-100 shadow-sm text-slate-500">
                    You currently do not have any classes assigned to you. Please contact Sunday School Admins to set up assignments.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {myClasses.map(cls => {
                      const classChildren = children.filter(c => c.classId === cls.id);
                      return (
                        <div key={cls.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-lg font-bold text-slate-900">{cls.name}</h3>
                              <p className="text-xs text-slate-500">Ages: {cls.ageRange}</p>
                            </div>
                            <span className="bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold px-3 py-1 rounded-full">
                              {classChildren.length} Enrolled
                            </span>
                          </div>

                          <div className="border-t border-slate-100 pt-4 space-y-3">
                            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Enrolled Kids</h4>
                            {classChildren.length === 0 ? (
                              <p className="text-xs text-slate-500 italic">No kids registered in this class yet.</p>
                            ) : (
                              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                                {classChildren.map(child => (
                                  <div key={child.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-xs">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center font-bold text-[10px] text-slate-700">
                                        {child.fullName.charAt(0)}
                                      </div>
                                      <div>
                                        <p className="font-bold text-slate-900">{child.fullName}</p>
                                        <p className="text-[10px] text-slate-500">DOB: {child.dateOfBirth}</p>
                                      </div>
                                    </div>
                                    {child.allergies && (
                                      <span className="bg-red-50 text-red-700 border border-red-100 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                        Allergy: {child.allergies}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: MARK ATTENDANCE */}
            {activeTab === 'attendance' && (
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Log Sunday Attendance</h3>
                    <p className="text-xs text-slate-500">Track and submit classroom presence logs on Sundays.</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-slate-500 uppercase">Class:</span>
                      <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg text-slate-950 text-xs px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">Select Class</option>
                        {myClasses.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-slate-500 uppercase">Date:</span>
                      <input
                        type="date"
                        value={attendanceDate}
                        onChange={(e) => setAttendanceDate(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg text-slate-950 text-xs px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {!selectedClassId ? (
                  <div className="text-center py-12 text-slate-500">Please select an assigned class above to start recording attendance.</div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl">
                      <span className="text-xs font-semibold text-slate-600">
                        Class Enrollment: {children.filter(c => c.classId === selectedClassId).length} children
                      </span>
                      <button
                        onClick={handleMarkAllPresent}
                        className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Mark All Present
                      </button>
                    </div>

                    <div className="space-y-2 border-t border-slate-100 pt-4">
                      {children.filter(c => c.classId === selectedClassId).length === 0 ? (
                        <p className="text-center text-slate-500 text-sm py-6">No kids registered in this class.</p>
                      ) : (
                        children.filter(c => c.classId === selectedClassId).map(child => {
                          const status = attendanceRecords[child.id] || 'absent';
                          return (
                            <div key={child.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-800 font-bold text-xs uppercase">
                                  {child.fullName.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-900">{child.fullName}</p>
                                  {child.allergies && <p className="text-[10px] text-red-600 font-bold">Allergy: {child.allergies}</p>}
                                </div>
                              </div>

                              <button
                                onClick={() => toggleAttendance(child.id)}
                                className={`text-xs font-bold px-4 py-1.5 rounded-lg border transition-all ${
                                  status === 'present'
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                                    : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                                }`}
                              >
                                {status === 'present' ? 'Present ✓' : 'Absent ✗'}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        onClick={handleSubmitAttendance}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm transition-colors"
                      >
                        Submit Class Attendance Log
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: DISMISSAL PICKUP VERIFICATION */}
            {activeTab === 'pickup_verification' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Verification Form */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Verify Pickup Authorization Code</h3>
                    <p className="text-xs text-slate-500">Child safety release checklist: do not release any child without an approved, verified parent security code.</p>
                  </div>

                  <form onSubmit={handleVerifyPickupCode} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500">1. Select Child to Dismiss</label>
                      <select
                        required
                        value={verifyChildId}
                        onChange={(e) => setVerifyChildId(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">Select Checked-In Child</option>
                        {/* List children checked in today */}
                        {children.map(c => {
                          const todayStr = new Date().toISOString().split('T')[0];
                          const checkedIn = checkIns.find(ci => ci.childId === c.id && ci.checkInDate === todayStr);
                          if (!checkedIn) return null;
                          const isReleased = !!checkedIn.checkedOutAt;
                          
                          return (
                            <option key={c.id} value={c.id} disabled={isReleased}>
                              {c.fullName} {isReleased ? '(Released)' : '(Checked-In)'}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500">2. Enter 6-Digit Code from Parent's Device</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={enteredCode}
                        onChange={(e) => setEnteredCode(e.target.value)}
                        placeholder="E.g. 842910"
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 font-mono tracking-widest text-lg text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      Verify Release Authorization Code
                    </button>
                  </form>

                  {/* Verification Response Display */}
                  {verificationResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`p-4 rounded-xl border flex items-start gap-3 ${
                        verificationResult.success
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-red-50 border-red-200 text-red-800'
                      }`}
                    >
                      {verificationResult.success ? (
                        <ShieldCheck className="w-6 h-6 shrink-0 text-emerald-600" />
                      ) : (
                        <ShieldAlert className="w-6 h-6 shrink-0 text-red-600" />
                      )}
                      <div>
                        <h4 className="font-bold text-sm">{verificationResult.success ? 'Security Verification Success' : 'Security Verification FAILED'}</h4>
                        <p className="text-xs mt-0.5 leading-relaxed">{verificationResult.message}</p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Checked In Log for today */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-900 text-sm uppercase text-slate-400 tracking-wider">Today's Check-In Status</h3>
                  <div className="space-y-3">
                    {children.map(c => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      const checkIn = checkIns.find(ci => ci.childId === c.id && ci.checkInDate === todayStr);
                      if (!checkIn) return null;

                      const isReleased = !!checkIn.checkedOutAt;

                      return (
                        <div key={c.id} className="flex justify-between items-center text-xs p-2.5 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-bold text-slate-900">{c.fullName}</p>
                            <p className="text-[10px] text-slate-400">
                              Checked in: {new Date(checkIn.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isReleased ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {isReleased ? 'Released' : 'In Class'}
                          </span>
                        </div>
                      );
                    })}

                    {checkIns.filter(ci => ci.checkInDate === new Date().toISOString().split('T')[0]).length === 0 && (
                      <p className="text-xs text-slate-500 italic text-center py-6">No children checked in today yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
