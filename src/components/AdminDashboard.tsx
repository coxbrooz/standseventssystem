import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import QRCode from 'qrcode';
import {
  Shield,
  Users,
  CheckCircle,
  XCircle,
  Calendar,
  BookOpen,
  MessageSquare,
  QrCode,
  Plus,
  Trash,
  Clock,
  UserCheck,
  Award,
  AlertTriangle,
  History,
  Send,
  Printer,
  ChevronRight,
  Database,
  Search,
  LogOut,
  Loader2
} from 'lucide-react';
import { api } from '../lib/api';
import { User, Child, Class, Subject, Lesson, CheckIn, Attendance, PerformanceRecord, PickupAudit, Message } from '../types';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

type TabType =
  | 'overview'
  | 'approvals'
  | 'classes'
  | 'subjects'
  | 'lessons'
  | 'staff'
  | 'check_in_log'
  | 'pickup_audit'
  | 'messages'
  | 'qr_poster';

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Core database tables states
  const [users, setUsers] = useState<User[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [pickupAudits, setPickupAudits] = useState<PickupAudit[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Class form
  const [newClassName, setNewClassName] = useState('');
  const [newClassAge, setNewClassAge] = useState('');
  const [newClassTeacher, setNewClassTeacher] = useState('');

  // Subject form
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjDesc, setNewSubjDesc] = useState('');

  // Lesson form
  const [newLessonSubj, setNewLessonSubj] = useState('');
  const [newLessonClass, setNewLessonClass] = useState('');
  const [newLessonTopic, setNewLessonTopic] = useState('');
  const [newLessonDate, setNewLessonDate] = useState('');
  const [newLessonNotes, setNewLessonNotes] = useState('');

  // Chat/Messages states
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [adminReplyMsg, setAdminReplyMsg] = useState('');

  // Canvas ref for generating QR Poster
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Whenever the QR poster tab or selected parent changes, render the QR code on the canvas
  useEffect(() => {
    if (activeTab === 'qr_poster' && qrCanvasRef.current) {
      // Create a URL pointing to our check-in applet endpoint
      const checkInUrl = `${window.location.origin}/check-in-entrance`;
      QRCode.toCanvas(
        qrCanvasRef.current,
        checkInUrl,
        {
          width: 250,
          margin: 1,
          color: {
            dark: '#1e293b', // Tailwind Slate-800
            light: '#ffffff'
          }
        },
        (err) => {
          if (err) console.error('QR code generation error', err);
        }
      );
    }
  }, [activeTab]);

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const [
        usersData,
        childrenData,
        classesData,
        subjectsData,
        lessonsData,
        checkInsData,
        attendanceData,
        pickupAuditsData,
        messagesData
      ] = await Promise.all([
        api.get<User[]>('/api/admin/users'),
        api.get<Child[]>('/api/children'),
        api.get<Class[]>('/api/classes'),
        api.get<Subject[]>('/api/subjects'),
        api.get<Lesson[]>('/api/lessons'),
        api.get<CheckIn[]>('/api/check-ins'),
        api.get<Attendance[]>('/api/attendance'),
        api.get<PickupAudit[]>('/api/pickup/audits'),
        api.get<Message[]>('/api/messages')
      ]);

      setUsers(usersData);
      setChildren(childrenData);
      setClasses(classesData);
      setSubjects(subjectsData);
      setLessons(lessonsData);
      setCheckIns(checkInsData);
      setAttendance(attendanceData);
      setPickupAudits(pickupAuditsData);
      setMessages(messagesData);
    } catch (err: any) {
      setError('Failed to fetch church database arrays.');
    } finally {
      setLoading(false);
    }
  };

  // Approval handlers
  const handleApproveStatus = async (userId: string, status: 'approved' | 'declined') => {
    setError('');
    setSuccess('');
    try {
      await api.post(`/api/admin/users/${userId}/approve`, { approvalStatus: status });
      setSuccess(`Account status updated to ${status}!`);
      // Update local state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, approvalStatus: status } : u));
    } catch (err: any) {
      setError(err.message || 'Approval update failed.');
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to completely delete the user ${name}?`)) return;
    try {
      await api.delete(`/api/admin/users/${userId}`);
      setSuccess(`${name} deleted successfully.`);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      setError('Deletion failed.');
    }
  };

  const handleToggleRole = async (userId: string, newRole: 'admin' | 'teacher' | 'parent') => {
    setError('');
    setSuccess('');
    try {
      await api.post(`/api/admin/users/${userId}/role`, { role: newRole });
      setSuccess(`User role set to ${newRole}.`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err: any) {
      setError(err.message || 'Failed to update user role.');
    }
  };

  // Class handlers
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName || !newClassAge) return;
    try {
      const cls = await api.post<Class>('/api/classes', {
        name: newClassName,
        ageRange: newClassAge,
        teacherId: newClassTeacher
      });
      setClasses(prev => [...prev, cls]);
      setSuccess(`Class ${newClassName} added!`);
      setNewClassName('');
      setNewClassAge('');
      setNewClassTeacher('');
    } catch (err: any) {
      setError('Failed to create class.');
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!window.confirm('Delete this Sunday School class?')) return;
    try {
      await api.delete(`/api/classes/${id}`);
      setClasses(prev => prev.filter(c => c.id !== id));
      setSuccess('Class deleted.');
    } catch (err: any) {
      setError('Failed to delete class.');
    }
  };

  // Subject handlers
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjName) return;
    try {
      const sub = await api.post<Subject>('/api/subjects', {
        name: newSubjName,
        description: newSubjDesc
      });
      setSubjects(prev => [...prev, sub]);
      setSuccess(`Subject ${newSubjName} created.`);
      setNewSubjName('');
      setNewSubjDesc('');
    } catch (err: any) {
      setError('Failed to create subject.');
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!window.confirm('Delete this subject?')) return;
    try {
      await api.delete(`/api/subjects/${id}`);
      setSubjects(prev => prev.filter(s => s.id !== id));
      setSuccess('Subject deleted.');
    } catch (err: any) {
      setError('Failed to delete subject.');
    }
  };

  // Lesson handlers
  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonSubj || !newLessonClass || !newLessonTopic || !newLessonDate) return;
    try {
      const les = await api.post<Lesson>('/api/lessons', {
        subjectId: newLessonSubj,
        classId: newLessonClass,
        topic: newLessonTopic,
        lessonDate: newLessonDate,
        notes: newLessonNotes
      });
      setLessons(prev => [...prev, les]);
      setSuccess(`Lesson topic "${newLessonTopic}" scheduled successfully!`);
      setNewLessonTopic('');
      setNewLessonDate('');
      setNewLessonNotes('');
    } catch (err: any) {
      setError('Failed to schedule lesson.');
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!window.confirm('Remove this lesson?')) return;
    try {
      await api.delete(`/api/lessons/${id}`);
      setLessons(prev => prev.filter(l => l.id !== id));
      setSuccess('Lesson deleted.');
    } catch (err: any) {
      setError('Failed to delete lesson.');
    }
  };

  // Chat message send (admin perspective)
  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentId || !adminReplyMsg.trim()) return;

    try {
      const sent = await api.post<Message>('/api/messages', {
        parentId: selectedParentId,
        message: adminReplyMsg
      });
      setMessages(prev => [...prev, sent]);
      setAdminReplyMsg('');
    } catch (err: any) {
      setError('Failed to reply.');
    }
  };

  const handlePrintPoster = () => {
    window.print();
  };

  // Group messages by Parent ID to display individual threads
  const threadsMap = messages.reduce<{ [parentId: string]: Message[] }>((acc, msg) => {
    if (!acc[msg.parentId]) acc[msg.parentId] = [];
    acc[msg.parentId].push(msg);
    return acc;
  }, {});

  const activeAdminsCount = users.filter(u => u.role === 'admin').length;
  const pendingUsers = users.filter(u => u.approvalStatus === 'pending');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-xl text-white">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-slate-900 leading-none">PCEA St Andrew's</h1>
                <span className="text-xs text-slate-500 font-semibold tracking-wide uppercase">Administrator Console</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-800">{user.fullName}</p>
                <p className="text-xs text-slate-500 capitalize">Founding Admin</p>
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
        {/* Alerts */}
        <div className="print:hidden">
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

          {/* Pending Approval warning banner if there are registrations */}
          {pendingUsers.length > 0 && activeTab !== 'approvals' && (
            <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-2 text-amber-900">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">Pending Registrations Awaiting Review</p>
                  <p className="text-xs text-amber-700">There are {pendingUsers.length} parent or teacher accounts requesting approval.</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('approvals')}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors whitespace-nowrap"
              >
                Review Approvals
              </button>
            </div>
          )}
        </div>

        {/* Horizontal Navigation Grid */}
        <div className="flex border-b border-slate-200 overflow-x-auto pb-px mb-6 scrollbar-none print:hidden">
          {[
            { id: 'overview', label: 'Overview', icon: Shield },
            { id: 'approvals', label: `Approvals (${pendingUsers.length})`, icon: UserCheck },
            { id: 'classes', label: 'Classes', icon: Users },
            { id: 'subjects', label: 'Subjects', icon: BookOpen },
            { id: 'lessons', label: 'Lessons', icon: Calendar },
            { id: 'staff', label: 'Staff & Admins', icon: Shield },
            { id: 'check_in_log', label: 'Check-In Log', icon: Clock },
            { id: 'pickup_audit', label: 'Pickup Audits', icon: History },
            { id: 'messages', label: 'Chats', icon: MessageSquare },
            { id: 'qr_poster', label: 'QR Poster', icon: QrCode }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as TabType);
                  setError('');
                  setSuccess('');
                }}
                className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 print:hidden">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            <p className="mt-4 text-slate-500 text-sm font-medium">Loading church administration panel...</p>
          </div>
        ) : (
          <div>
            {/* TAB: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6 print:hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Enrolled Children', val: children.length, desc: 'Registered Sunday School kids', col: 'text-blue-600 bg-blue-50' },
                    { label: 'Approved Parents', val: users.filter(u => u.role === 'parent' && u.approvalStatus === 'approved').length, desc: 'Active families', col: 'text-indigo-600 bg-indigo-50' },
                    { label: 'Assigned Teachers', val: users.filter(u => u.role === 'teacher' && u.approvalStatus === 'approved').length, desc: 'Classroom leaders', col: 'text-emerald-600 bg-emerald-50' },
                    { label: "Today's Check-ins", val: checkIns.filter(ci => ci.checkInDate === new Date().toISOString().split('T')[0]).length, desc: 'Kids checked in today', col: 'text-pink-600 bg-pink-50' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{stat.label}</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900">{stat.val}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">{stat.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Today's active checked in roster list */}
                  <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-900 text-base">Today's Check-In Log</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase">
                            <th className="pb-3">Child Name</th>
                            <th className="pb-3">Check-In Time</th>
                            <th className="pb-3">Pickup Code</th>
                            <th className="pb-3">Dismissal Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {checkIns
                            .filter(ci => ci.checkInDate === new Date().toISOString().split('T')[0])
                            .map(ci => {
                              const child = children.find(c => c.id === ci.childId);
                              return (
                                <tr key={ci.id} className="text-slate-700">
                                  <td className="py-3 font-bold text-slate-900">{child ? child.fullName : 'Unknown'}</td>
                                  <td className="py-3">{new Date(ci.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                  <td className="py-3 font-mono font-bold text-blue-700">{ci.pickupCode}</td>
                                  <td className="py-3">
                                    <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                      ci.checkedOutAt ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                    }`}>
                                      {ci.checkedOutAt ? `Released` : 'In Class'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          {checkIns.filter(ci => ci.checkInDate === new Date().toISOString().split('T')[0]).length === 0 && (
                            <tr>
                              <td colSpan={4} className="py-8 text-center text-slate-400 italic">No children checked in today. Print the QR poster for check-in!</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Quick pickup security check panel */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-900 text-base">Dismissal Stats</h3>
                    <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Total Dismissed Today:</span>
                        <span className="font-bold text-emerald-700">
                          {checkIns.filter(ci => ci.checkInDate === new Date().toISOString().split('T')[0] && ci.checkedOutAt).length} kids
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Remaining In Class:</span>
                        <span className="font-bold text-amber-700">
                          {checkIns.filter(ci => ci.checkInDate === new Date().toISOString().split('T')[0] && !ci.checkedOutAt).length} kids
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Verification Success Rate:</span>
                        <span className="font-bold text-blue-700">
                          {pickupAudits.length > 0
                            ? `${Math.round((pickupAudits.filter(a => a.success).length / pickupAudits.length) * 100)}%`
                            : '100%'}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
                      <p className="font-semibold text-slate-800">Child Release Directives:</p>
                      <p className="text-slate-500 leading-relaxed text-[11px]">
                        Every code submission is logged in the Pickup Audit log. Failed code entries indicate potential unauthorized pickup attempts and generate automated admin flags.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: APPROVALS */}
            {activeTab === 'approvals' && (
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6 print:hidden">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Parent & Staff Account Reviews</h3>
                  <p className="text-xs text-slate-500">Approve or reject new signups to grant access to Sunday School panels.</p>
                </div>

                {users.filter(u => u.approvalStatus === 'pending').length === 0 ? (
                  <div className="text-center py-12 text-slate-500 italic">No registrations pending approval. All caught up!</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase">
                          <th className="pb-3">Full Name</th>
                          <th className="pb-3">Email Address</th>
                          <th className="pb-3">Phone</th>
                          <th className="pb-3">Requested Role</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {users
                          .filter(u => u.approvalStatus === 'pending')
                          .map(pendingUser => (
                            <tr key={pendingUser.id} className="text-slate-700">
                              <td className="py-3 font-bold text-slate-900">{pendingUser.fullName}</td>
                              <td className="py-3">{pendingUser.email}</td>
                              <td className="py-3">{pendingUser.phone}</td>
                              <td className="py-3 capitalize">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  pendingUser.role === 'admin'
                                    ? 'bg-red-50 text-red-700'
                                    : pendingUser.role === 'teacher'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-blue-50 text-blue-700'
                                }`}>
                                  {pendingUser.role}
                                </span>
                              </td>
                              <td className="py-3 text-right space-x-2">
                                <button
                                  onClick={() => handleApproveStatus(pendingUser.id, 'approved')}
                                  className="px-3 py-1 bg-emerald-600 text-white rounded font-bold text-[10px] hover:bg-emerald-700 transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleApproveStatus(pendingUser.id, 'declined')}
                                  className="px-3 py-1 bg-red-100 text-red-700 rounded font-bold text-[10px] hover:bg-red-200 transition-colors"
                                >
                                  Decline
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: CLASSES */}
            {activeTab === 'classes' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
                {/* Form to create class */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm h-fit space-y-4">
                  <h3 className="font-bold text-slate-900 text-lg">Add Sunday Class</h3>
                  <form onSubmit={handleCreateClass} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500">Class Name *</label>
                      <input
                        type="text"
                        required
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        placeholder="E.g. Beginners"
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 text-sm focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500">Age Range *</label>
                      <input
                        type="text"
                        required
                        value={newClassAge}
                        onChange={(e) => setNewClassAge(e.target.value)}
                        placeholder="E.g. 3-6 years"
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 text-sm focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500">Assign Teacher</label>
                      <select
                        value={newClassTeacher}
                        onChange={(e) => setNewClassTeacher(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 text-sm focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select an Approved Teacher</option>
                        {users
                          .filter(u => u.role === 'teacher' && u.approvalStatus === 'approved')
                          .map(t => (
                            <option key={t.id} value={t.id}>{t.fullName}</option>
                          ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors"
                    >
                      Save Sunday Class
                    </button>
                  </form>
                </div>

                {/* List of classes */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-900 text-lg">Sunday Classrooms ({classes.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {classes.map(c => {
                      const teacher = users.find(u => u.id === c.teacherId);
                      const enrollment = children.filter(ch => ch.classId === c.id).length;
                      return (
                        <div key={c.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-slate-900 text-base">{c.name}</h4>
                              <button
                                onClick={() => handleDeleteClass(c.id)}
                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-white rounded transition-colors"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-xs text-slate-500">Age Bracket: {c.ageRange}</p>
                            <p className="text-xs text-slate-600 mt-2">
                              <span className="font-semibold">Teacher:</span> {teacher ? teacher.fullName : 'Unassigned'}
                            </p>
                          </div>
                          <div className="mt-4 pt-2 border-t border-slate-200/50 flex justify-between items-center text-xs text-slate-500 font-semibold">
                            <span>Headcount:</span>
                            <span className="text-blue-700 bg-white border px-2 py-0.5 rounded-full">{enrollment} registered</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SUBJECTS */}
            {activeTab === 'subjects' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
                {/* Create subject form */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm h-fit space-y-4">
                  <h3 className="font-bold text-slate-900 text-lg">Create New Subject</h3>
                  <form onSubmit={handleCreateSubject} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500">Subject Name *</label>
                      <input
                        type="text"
                        required
                        value={newSubjName}
                        onChange={(e) => setNewSubjName(e.target.value)}
                        placeholder="E.g. Memory Verses, Quiz"
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 text-sm focus:ring-1"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500">Description</label>
                      <textarea
                        value={newSubjDesc}
                        onChange={(e) => setNewSubjDesc(e.target.value)}
                        placeholder="Brief overview of curriculum objectives..."
                        rows={3}
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 text-sm focus:ring-1"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors"
                    >
                      Save Subject
                    </button>
                  </form>
                </div>

                {/* Subjects list */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-900 text-lg">Sunday School Curriculum Subjects</h3>
                  <div className="space-y-3">
                    {subjects.map(s => (
                      <div key={s.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-950 text-sm">{s.name}</h4>
                          <p className="text-xs text-slate-600">{s.description || 'No description supplied.'}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteSubject(s.id)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-white rounded transition-colors shrink-0"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {subjects.length === 0 && (
                      <p className="text-xs text-slate-500 italic text-center py-6">No subjects created yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: LESSONS */}
            {activeTab === 'lessons' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
                {/* Create Lesson form */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm h-fit space-y-4">
                  <h3 className="font-bold text-slate-900 text-lg">Schedule Lesson</h3>
                  <form onSubmit={handleCreateLesson} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500">Subject *</label>
                      <select
                        required
                        value={newLessonSubj}
                        onChange={(e) => setNewLessonSubj(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 text-sm focus:ring-1 focus:outline-none"
                      >
                        <option value="">Select Subject</option>
                        {subjects.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500">Classroom *</label>
                      <select
                        required
                        value={newLessonClass}
                        onChange={(e) => setNewLessonClass(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 text-sm focus:ring-1 focus:outline-none"
                      >
                        <option value="">Select Class</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500">Lesson Topic / Verse *</label>
                      <input
                        type="text"
                        required
                        value={newLessonTopic}
                        onChange={(e) => setNewLessonTopic(e.target.value)}
                        placeholder="E.g. David and Goliath"
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 text-sm focus:ring-1"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500">Scheduled Date *</label>
                      <input
                        type="date"
                        required
                        value={newLessonDate}
                        onChange={(e) => setNewLessonDate(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 text-sm focus:ring-1"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500">Study Guide / Notes</label>
                      <textarea
                        value={newLessonNotes}
                        onChange={(e) => setNewLessonNotes(e.target.value)}
                        placeholder="Key verse citations, moral points..."
                        rows={2}
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 text-sm focus:ring-1"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors"
                    >
                      Publish Lesson
                    </button>
                  </form>
                </div>

                {/* Lessons schedule */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-900 text-lg">Upcoming Sunday Lessons Calendar</h3>
                  <div className="space-y-3">
                    {lessons.map(l => {
                      const sub = subjects.find(s => s.id === l.subjectId);
                      const cls = classes.find(c => c.id === l.classId);
                      return (
                        <div key={l.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-black text-blue-600 tracking-wider">
                              {sub ? sub.name : 'Curriculum'} — Scheduled {l.lessonDate}
                            </span>
                            <h4 className="font-bold text-slate-950 text-sm">{l.topic}</h4>
                            <p className="text-xs text-slate-600">
                              <span className="font-semibold text-slate-800">Class:</span> {cls ? cls.name : 'Unknown'}
                            </p>
                            {l.notes && <p className="text-xs text-slate-500 italic mt-1 bg-white p-2 border rounded font-serif">"{l.notes}"</p>}
                          </div>
                          <button
                            onClick={() => handleDeleteLesson(l.id)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-white rounded transition-colors shrink-0"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                    {lessons.length === 0 && (
                      <p className="text-xs text-slate-500 italic text-center py-6">No lessons scheduled yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: STAFF MANAGEMENT */}
            {activeTab === 'staff' && (
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6 print:hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Staff & Administration Roster</h3>
                    <p className="text-xs text-slate-500">Manage church Sunday School teachers and administrators. Hard cap of 5 admins is strictly enforced for safety.</p>
                  </div>
                  <span className="bg-slate-100 text-slate-800 border px-3 py-1 text-xs font-bold rounded-lg shrink-0">
                    Admin headcount: {activeAdminsCount} / 5
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase">
                        <th className="pb-3">Name</th>
                        <th className="pb-3">Email Address</th>
                        <th className="pb-3">Phone</th>
                        <th className="pb-3">Approval Status</th>
                        <th className="pb-3">Access Level</th>
                        <th className="pb-3 text-right">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {users
                        .filter(u => u.role === 'admin' || u.role === 'teacher')
                        .map(staff => (
                          <tr key={staff.id} className="text-slate-700">
                            <td className="py-3 font-bold text-slate-900">{staff.fullName}</td>
                            <td className="py-3">{staff.email}</td>
                            <td className="py-3">{staff.phone}</td>
                            <td className="py-3 capitalize">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                staff.approvalStatus === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                              }`}>
                                {staff.approvalStatus}
                              </span>
                            </td>
                            <td className="py-3 capitalize">
                              <select
                                value={staff.role}
                                onChange={(e) => handleToggleRole(staff.id, e.target.value as any)}
                                className="bg-white border rounded text-slate-950 px-1 py-0.5 text-xs focus:ring-1"
                              >
                                <option value="teacher">Teacher</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td className="py-3 text-right">
                              {staff.id !== user.id ? (
                                <button
                                  onClick={() => handleDeleteUser(staff.id, staff.fullName)}
                                  className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-50"
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-400">Locked</span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: CHECK-IN LOG */}
            {activeTab === 'check_in_log' && (
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4 print:hidden">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Sunday Arrival & Dismissal Log</h3>
                  <p className="text-xs text-slate-500">Historical archive of checked-in children and departure releases.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase">
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Child Name</th>
                        <th className="pb-3">Checked In At</th>
                        <th className="pb-3">Checked Out At</th>
                        <th className="pb-3">Daily Pickup Code</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {checkIns.map(ci => {
                        const child = children.find(c => c.id === ci.childId);
                        return (
                          <tr key={ci.id} className="text-slate-700">
                            <td className="py-3 font-semibold text-slate-900">{ci.checkInDate}</td>
                            <td className="py-3 font-bold text-slate-900">{child ? child.fullName : 'Unknown Child'}</td>
                            <td className="py-3">{new Date(ci.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="py-3">
                              {ci.checkedOutAt ? (
                                <span className="text-emerald-700 font-semibold">
                                  {new Date(ci.checkedOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              ) : (
                                <span className="text-amber-600 font-medium italic">Still in Class</span>
                              )}
                            </td>
                            <td className="py-3 font-mono font-bold text-blue-700">{ci.pickupCode}</td>
                          </tr>
                        );
                      })}
                      {checkIns.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 italic">No check-ins logged.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: PICKUP AUDIT LOG */}
            {activeTab === 'pickup_audit' && (
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4 print:hidden">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Daily Pickup Security Audit Trail</h3>
                  <p className="text-xs text-slate-500">Every single daily code submission and authorization release is strictly captured for security compliance.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase">
                        <th className="pb-3">Timestamp</th>
                        <th className="pb-3">Child Name</th>
                        <th className="pb-3">Entered Code</th>
                        <th className="pb-3">Teacher</th>
                        <th className="pb-3">Result</th>
                        <th className="pb-3">Reason / Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {pickupAudits.map(audit => (
                        <tr key={audit.id} className="text-slate-700">
                          <td className="py-3 text-slate-500">{new Date(audit.createdAt).toLocaleString()}</td>
                          <td className="py-3 font-bold text-slate-900">{audit.childNameSnapshot}</td>
                          <td className="py-3 font-mono text-slate-900 font-semibold">{audit.enteredCode}</td>
                          <td className="py-3 text-slate-600">{audit.teacherNameSnapshot}</td>
                          <td className="py-3">
                            <span className={`inline-block px-2 py-0.5 rounded font-bold text-[9px] uppercase ${
                              audit.success
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {audit.success ? 'Success ✓' : 'Failure ✗'}
                            </span>
                          </td>
                          <td className="py-3 text-slate-500 italic">{audit.reason}</td>
                        </tr>
                      ))}
                      {pickupAudits.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 italic">No pickup code audits recorded yet. Verification attempts will be logged here.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: MESSAGES / THREADS */}
            {activeTab === 'messages' && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col md:flex-row h-[550px] print:hidden">
                {/* Threads Sidebar list */}
                <div className="w-full md:w-80 border-r border-slate-100 flex flex-col bg-slate-50">
                  <div className="p-4 border-b border-slate-100 bg-white">
                    <h3 className="font-bold text-slate-900 text-sm">Active Parent Threads</h3>
                    <p className="text-[11px] text-slate-400">Select parent message to open thread.</p>
                  </div>
                  <div className="flex-grow overflow-y-auto divide-y divide-slate-100">
                    {Object.keys(threadsMap).map(pId => {
                      const parentUser = users.find(u => u.id === pId);
                      const parentName = parentUser ? parentUser.fullName : 'Parent';
                      const threadMsgs = threadsMap[pId];
                      const lastMsg = threadMsgs[threadMsgs.length - 1];

                      return (
                        <button
                          key={pId}
                          onClick={() => {
                            setSelectedParentId(pId);
                            setError('');
                            setSuccess('');
                          }}
                          className={`w-full p-4 text-left text-xs transition-colors flex flex-col gap-1 ${
                            selectedParentId === pId ? 'bg-blue-50/60' : 'bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900">{parentName}</span>
                            <span className="text-[9px] text-slate-400">
                              {new Date(lastMsg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-500 truncate">{lastMsg.message}</p>
                        </button>
                      );
                    })}

                    {Object.keys(threadsMap).length === 0 && (
                      <p className="text-xs text-slate-500 text-center py-12 italic">No active parent support chat threads.</p>
                    )}
                  </div>
                </div>

                {/* Active Chat Thread View */}
                <div className="flex-grow flex flex-col bg-white h-full justify-between">
                  {selectedParentId ? (
                    <>
                      <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">
                            Thread: {users.find(u => u.id === selectedParentId)?.fullName}
                          </h4>
                          <p className="text-[10px] text-slate-500">Sunday School parent support helpline</p>
                        </div>
                      </div>

                      {/* Chat messages box */}
                      <div className="flex-grow overflow-y-auto p-6 space-y-4">
                        {(threadsMap[selectedParentId] || []).map(msg => {
                          const isMe = msg.senderId === user.id;
                          return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[70%] rounded-2xl p-4 text-xs shadow-sm ${
                                isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-900 rounded-tl-none'
                              }`}>
                                <p className="leading-relaxed">{msg.message}</p>
                                <span className={`block text-[8px] mt-1.5 ${isMe ? 'text-blue-200' : 'text-slate-400'} text-right`}>
                                  {new Date(msg.sentAt).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Message input */}
                      <form onSubmit={handleSendAdminReply} className="border-t border-slate-100 p-4 flex gap-2 bg-white">
                        <input
                          type="text"
                          value={adminReplyMsg}
                          onChange={(e) => setAdminReplyMsg(e.target.value)}
                          placeholder="Type your reply to this parent..."
                          className="flex-grow px-4 py-2 border border-slate-300 rounded-xl text-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1"
                        >
                          <Send className="w-3.5 h-3.5" /> Reply
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="text-center py-24 text-slate-500 flex flex-col items-center justify-center h-full">
                      <MessageSquare className="w-12 h-12 text-slate-300 mb-2" />
                      <p className="text-sm font-semibold">No thread selected</p>
                      <p className="text-xs text-slate-400 mt-0.5">Choose an active parent chat conversation from the sidebar to reply.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: QR POSTER (WITH PRINTER TRIGGER) */}
            {activeTab === 'qr_poster' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Sunday Morning Check-In QR Poster</h3>
                    <p className="text-xs text-slate-500">Print this poster and mount it at the PCEA St Andrew's Sunday School entrance. Parents can scan it to launch child check-in.</p>
                  </div>
                  <button
                    onClick={handlePrintPoster}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-sm shrink-0"
                  >
                    <Printer className="w-4 h-4" /> Print Check-In Poster
                  </button>
                </div>

                {/* Printable poster area */}
                <div className="flex justify-center py-6">
                  <div className="bg-white border-8 border-blue-900 w-full max-w-[500px] p-8 rounded-3xl shadow-lg flex flex-col items-center text-center space-y-6 print:border-4 print:shadow-none print:w-full">
                    
                    {/* Header */}
                    <div className="space-y-1.5">
                      <h2 className="text-xs font-black tracking-widest text-blue-900 uppercase">PCEA St Andrew's Church</h2>
                      <h3 className="text-2xl font-extrabold text-slate-900 leading-tight">SUNDAY SCHOOL</h3>
                      <div className="h-1 w-24 bg-blue-900 mx-auto rounded-full"></div>
                    </div>

                    <p className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                      Morning Arrival Child Check-In
                    </p>

                    {/* Canvas for rendering QR */}
                    <div className="bg-slate-50 p-4 border-2 border-slate-100 rounded-2xl shadow-inner flex items-center justify-center">
                      <canvas ref={qrCanvasRef} className="w-[250px] h-[250px]" />
                    </div>

                    {/* Instructions */}
                    <div className="space-y-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-50 w-full">
                      <p className="text-xs font-extrabold text-blue-900 uppercase">3 Quick Steps for Parents:</p>
                      <ol className="text-left text-[11px] text-slate-700 space-y-1.5 pl-3 list-decimal font-medium">
                        <li>Scan this QR Code with your mobile phone camera.</li>
                        <li>Log in and select your children attending Sunday School today.</li>
                        <li>Confirm check-in to get your secure <strong>6-digit Daily Pickup Code</strong>.</li>
                      </ol>
                    </div>

                    <div className="pt-2 border-t border-slate-100 w-full text-center">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        ★ Child Safety Priority System ★
                      </p>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        No child is released at dismissal without teacher verification of the daily pickup code.
                      </p>
                    </div>

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
