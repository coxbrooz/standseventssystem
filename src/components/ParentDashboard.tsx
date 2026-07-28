import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  Calendar,
  Award,
  BookOpen,
  MessageSquare,
  Plus,
  Trash,
  CheckCircle,
  QrCode,
  AlertCircle,
  ShieldAlert,
  Loader2,
  LogOut,
  Send,
  User,
  Heart
} from 'lucide-react';
import { api } from '../lib/api';
import { User as UserType, Child, Class, Lesson, Subject, CheckIn, Attendance, PerformanceRecord, Message } from '../types';

interface ParentDashboardProps {
  user: UserType;
  onLogout: () => void;
}

type TabType = 'my_children' | 'attendance' | 'performance' | 'lessons' | 'chat';

export default function ParentDashboard({ user, onLogout }: ParentDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('my_children');
  
  // Data states
  const [children, setChildren] = useState<Child[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Loading & Action states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Register child form
  const [showRegForm, setShowRegForm] = useState(false);
  const [childName, setChildName] = useState('');
  const [childDob, setChildDob] = useState('');
  const [childClassId, setChildClassId] = useState('');
  const [childAllergies, setChildAllergies] = useState('');
  const [childNotes, setChildNotes] = useState('');
  const [childPickup, setChildPickup] = useState('');
  const [childPhoto, setChildPhoto] = useState('');

  // Check-In Selector State
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [activePickupCodes, setActivePickupCodes] = useState<{ [childId: string]: string }>({});

  // Chat States
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [
        childrenData,
        classesData,
        lessonsData,
        subjectsData,
        checkInsData,
        attendanceData,
        performanceData,
        messagesData
      ] = await Promise.all([
        api.get<Child[]>('/api/children'),
        api.get<Class[]>('/api/classes'),
        api.get<Lesson[]>('/api/lessons'),
        api.get<Subject[]>('/api/subjects'),
        api.get<CheckIn[]>('/api/check-ins'),
        api.get<Attendance[]>('/api/attendance'),
        api.get<PerformanceRecord[]>('/api/performance'),
        api.get<Message[]>('/api/messages')
      ]);

      setChildren(childrenData);
      setClasses(classesData);
      setLessons(lessonsData);
      setSubjects(subjectsData);
      setCheckIns(checkInsData);
      setAttendance(attendanceData);
      setPerformance(performanceData);
      setMessages(messagesData);

      // Populate current daily pickup codes if checked in today
      const todayStr = new Date().toISOString().split('T')[0];
      const codes: { [childId: string]: string } = {};
      checkInsData.forEach(ci => {
        if (ci.checkInDate === todayStr) {
          codes[ci.childId] = ci.pickupCode;
        }
      });
      setActivePickupCodes(codes);
    } catch (err: any) {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterChild = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!childName || !childDob || !childClassId) {
      setError('Name, Date of Birth, and Class are required.');
      return;
    }

    try {
      const child = await api.post<Child>('/api/children', {
        fullName: childName,
        dateOfBirth: childDob,
        classId: childClassId,
        allergies: childAllergies,
        notes: childNotes,
        authorizedPickup: childPickup,
        photoPath: childPhoto
      });

      setChildren(prev => [...prev, child]);
      setSuccess(`${childName} registered successfully!`);
      setShowRegForm(false);
      // Reset form
      setChildName('');
      setChildDob('');
      setChildClassId('');
      setChildAllergies('');
      setChildNotes('');
      setChildPickup('');
      setChildPhoto('');
    } catch (err: any) {
      setError(err.message || 'Failed to register child.');
    }
  };

  const handleDeleteChild = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from Sunday School?`)) return;
    try {
      await api.delete(`/api/children/${id}`);
      setChildren(prev => prev.filter(c => c.id !== id));
      setSuccess(`${name} has been removed.`);
    } catch (err: any) {
      setError('Failed to delete child record.');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setChildPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const toggleChildSelection = (id: string) => {
    if (selectedChildIds.includes(id)) {
      setSelectedChildIds(prev => prev.filter(cid => cid !== id));
    } else {
      setSelectedChildIds(prev => [...prev, id]);
    }
  };

  const handleBatchCheckIn = async () => {
    if (selectedChildIds.length === 0) {
      setError('Please select at least one child to check in.');
      return;
    }
    setError('');
    setSuccess('');

    try {
      const results = await api.post<CheckIn[]>('/api/check-ins', { childIds: selectedChildIds });
      
      const updatedCodes = { ...activePickupCodes };
      results.forEach(ci => {
        updatedCodes[ci.childId] = ci.pickupCode;
      });
      setActivePickupCodes(updatedCodes);
      setSuccess('Children checked in! Your daily pickup code(s) have been generated.');
      setSelectedChildIds([]);
      
      // Refresh check-ins
      const refreshedCheckIns = await api.get<CheckIn[]>('/api/check-ins');
      setCheckIns(refreshedCheckIns);
    } catch (err: any) {
      setError(err.message || 'Failed to complete child check-in.');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const sentMsg = await api.post<Message>('/api/messages', {
        message: newMessage
      });
      setMessages(prev => [...prev, sentMsg]);
      setNewMessage('');
    } catch (err: any) {
      setError('Failed to send message.');
    }
  };

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
                <span className="text-xs text-slate-500 font-semibold tracking-wide uppercase">Parent Portal</span>
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

      {/* Main container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-grow w-full">
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-xl text-red-700 text-sm flex items-start gap-2">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-xl text-emerald-700 text-sm flex items-start gap-2">
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 overflow-x-auto pb-px mb-6 scrollbar-none">
          <button
            onClick={() => setActiveTab('my_children')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'my_children' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" /> My Children
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'attendance' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar className="w-4 h-4" /> Attendance History
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'performance' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Award className="w-4 h-4" /> Performance/Scores
          </button>
          <button
            onClick={() => setActiveTab('lessons')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'lessons' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Upcoming Lessons
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'chat' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Chat with Admins
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            <p className="mt-4 text-slate-500 text-sm font-medium">Loading your Sunday School profile...</p>
          </div>
        ) : (
          <div>
            {/* TAB: MY CHILDREN */}
            {activeTab === 'my_children' && (
              <div className="space-y-8">
                {/* Check In Poster simulated QR Code scan for easy sandbox workflow */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-blue-600" /> Sunday Morning Entrance Check-In
                    </h3>
                    <p className="text-slate-600 text-sm max-w-xl">
                      Select your children from the list below and click <strong>Check In</strong> to generate their secure 6-digit Daily Pickup Code. Provide this code to teachers at dismissal.
                    </p>
                  </div>
                </div>

                {/* Main section: Children List & Pickup Codes */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left list & check-in triggers */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-bold text-slate-900">Registered Children ({children.length})</h3>
                      <button
                        onClick={() => setShowRegForm(!showRegForm)}
                        className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all"
                      >
                        <Plus className="w-4 h-4" /> {showRegForm ? 'Cancel' : 'Register Child'}
                      </button>
                    </div>

                    {showRegForm && (
                      <form onSubmit={handleRegisterChild} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        <h4 className="font-bold text-slate-800">Child Registration Details</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold uppercase text-slate-500">Full Name *</label>
                            <input
                              type="text"
                              required
                              value={childName}
                              onChange={(e) => setChildName(e.target.value)}
                              placeholder="E.g. Peter Kamau"
                              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold uppercase text-slate-500">Date of Birth *</label>
                            <input
                              type="date"
                              required
                              value={childDob}
                              onChange={(e) => setChildDob(e.target.value)}
                              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold uppercase text-slate-500">Assigned Class *</label>
                            <select
                              required
                              value={childClassId}
                              onChange={(e) => setChildClassId(e.target.value)}
                              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                              <option value="">Select a Class</option>
                              {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.ageRange})</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold uppercase text-slate-500">Authorized Pickup Adults</label>
                            <input
                              type="text"
                              value={childPickup}
                              onChange={(e) => setChildPickup(e.target.value)}
                              placeholder="E.g. Jane Kamau, John Kamau (Uncle)"
                              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold uppercase text-slate-500">Allergies / Dietary Restrictions</label>
                            <input
                              type="text"
                              value={childAllergies}
                              onChange={(e) => setChildAllergies(e.target.value)}
                              placeholder="E.g. Peanuts, none"
                              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold uppercase text-slate-500">Private Profile Photo (Optional)</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoUpload}
                              className="mt-1 block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold uppercase text-slate-500">Special Notes / Medical Directives</label>
                          <textarea
                            value={childNotes}
                            onChange={(e) => setChildNotes(e.target.value)}
                            placeholder="Any other details the teachers should know..."
                            rows={2}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-950 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>

                        {childPhoto && (
                          <div className="mt-2 flex items-center gap-3">
                            <span className="text-xs text-slate-500">Photo preview:</span>
                            <img src={childPhoto} alt="Preview" className="w-12 h-12 rounded-full object-cover border border-slate-200" />
                          </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowRegForm(false)}
                            className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
                          >
                            Add Child
                          </button>
                        </div>
                      </form>
                    )}

                    {children.length === 0 ? (
                      <div className="bg-white text-center py-12 px-4 rounded-2xl border border-slate-100 shadow-sm">
                        <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600 font-semibold text-lg">No Children Registered</p>
                        <p className="text-slate-500 text-sm mt-1 mb-6">You haven't added any child profiles to Sunday School yet.</p>
                        <button
                          onClick={() => setShowRegForm(true)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                        >
                          Register First Child
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {children.map(c => {
                          const cls = classes.find(cl => cl.id === c.classId);
                          const isSelected = selectedChildIds.includes(c.id);
                          const todayStr = new Date().toISOString().split('T')[0];
                          const todayCheckIn = checkIns.find(ci => ci.childId === c.id && ci.checkInDate === todayStr);

                          return (
                            <div
                              key={c.id}
                              className={`bg-white rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                                isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-100 hover:border-slate-300 shadow-sm'
                              }`}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-3">
                                    {c.photoPath ? (
                                      <img src={c.photoPath} alt={c.fullName} className="w-12 h-12 rounded-full object-cover border border-slate-200" />
                                    ) : (
                                      <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold border border-blue-100 text-lg uppercase">
                                        {c.fullName.charAt(0)}
                                      </div>
                                    )}
                                    <div>
                                      <h4 className="font-bold text-slate-900">{c.fullName}</h4>
                                      <p className="text-xs text-slate-500">DOB: {c.dateOfBirth}</p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteChild(c.id, c.fullName)}
                                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-50 rounded-lg transition-colors"
                                    title="Delete registration"
                                  >
                                    <Trash className="w-4 h-4" />
                                  </button>
                                </div>

                                <div className="mt-4 space-y-1.5 text-xs text-slate-600 border-t border-slate-50 pt-3">
                                  <div>
                                    <span className="font-semibold text-slate-800">Assigned Class:</span> {cls ? `${cls.name} (${cls.ageRange})` : 'None'}
                                  </div>
                                  {c.allergies && (
                                    <div>
                                      <span className="font-semibold text-red-700 bg-red-50 px-1.5 py-0.5 rounded text-[10px]">Allergies:</span> {c.allergies}
                                    </div>
                                  )}
                                  {c.authorizedPickup && (
                                    <div>
                                      <span className="font-semibold text-slate-800">Authorized Pickup:</span> {c.authorizedPickup}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="mt-5 pt-3 border-t border-slate-50 flex items-center justify-between gap-2">
                                {todayCheckIn ? (
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                                    <CheckCircle className="w-4 h-4" /> Checked In Today
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => toggleChildSelection(c.id)}
                                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all text-center ${
                                      isSelected
                                        ? 'bg-blue-600 border-blue-600 text-white'
                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    {isSelected ? 'Selected for Check-In' : 'Select for Check-In'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Batch Check In Trigger */}
                    {selectedChildIds.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-blue-600 text-white p-4 rounded-2xl flex items-center justify-between gap-4 shadow-md shadow-blue-600/10"
                      >
                        <p className="text-sm font-semibold">
                          Ready to check in {selectedChildIds.length} children?
                        </p>
                        <button
                          onClick={handleBatchCheckIn}
                          className="px-5 py-2 bg-white text-blue-700 font-bold text-sm rounded-lg hover:bg-slate-50 transition-all"
                        >
                          Confirm Sunday Check-In
                        </button>
                      </motion.div>
                    )}
                  </div>

                  {/* Right side: Daily Pickup Code display */}
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <h3 className="font-bold text-slate-900 text-lg flex items-center gap-1.5 mb-2">
                        <Heart className="w-5 h-5 text-red-500 fill-red-500" /> Daily Pickup Codes
                      </h3>
                      <p className="text-xs text-slate-500 mb-4">
                        These are unique 6-digit codes generated fresh each Sunday. Teachers will require these codes to release children at dismissal.
                      </p>

                      {Object.keys(activePickupCodes).length === 0 ? (
                        <div className="bg-slate-50 text-center py-8 px-4 rounded-xl border border-dashed border-slate-200">
                          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-xs text-slate-600 font-bold">No active pickup codes</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Please check in your children to view pickup authorization codes.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {children.map(c => {
                            const code = activePickupCodes[c.id];
                            if (!code) return null;
                            const todayStr = new Date().toISOString().split('T')[0];
                            const checkInRecord = checkIns.find(ci => ci.childId === c.id && ci.checkInDate === todayStr);
                            const isReleased = !!checkInRecord?.checkedOutAt;

                            return (
                              <div key={c.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 relative overflow-hidden">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-bold text-slate-800">{c.fullName}</span>
                                  {isReleased ? (
                                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded">
                                      Released
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <div className="text-2xl font-mono font-bold tracking-widest text-slate-900 text-center bg-white py-3 border border-slate-200/60 rounded-lg shadow-inner">
                                  {isReleased ? '------' : code}
                                </div>
                                {isReleased && (
                                  <p className="text-[10px] text-emerald-700 font-medium mt-1 text-center">
                                    Dismissed at {new Date(checkInRecord.checkedOutAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ATTENDANCE HISTORY */}
            {activeTab === 'attendance' && (
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <h3 className="font-bold text-slate-900 text-lg mb-2">Class Attendance Logs</h3>
                <p className="text-xs text-slate-500 mb-6">Sunday attendance records recorded by Sunday School teachers.</p>

                {children.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">Please register children to view attendance records.</div>
                ) : (
                  <div className="space-y-6">
                    {children.map(c => {
                      const childAttendance = attendance.filter(a => a.childId === c.id);
                      return (
                        <div key={c.id} className="border-b border-slate-100 pb-6 last:border-0 last:pb-0">
                          <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span> {c.fullName}
                          </h4>
                          
                          {childAttendance.length === 0 ? (
                            <p className="text-xs text-slate-500 italic pl-4">No attendance history logged yet.</p>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pl-4">
                              {childAttendance.map(att => (
                                <div key={att.id} className="bg-slate-50 p-2.5 rounded-lg text-center border border-slate-100">
                                  <span className="block text-[10px] font-bold text-slate-500">{att.date}</span>
                                  <span className={`inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded ${
                                    att.status === 'present' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                                  }`}>
                                    {att.status === 'present' ? 'Present' : 'Absent'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: PERFORMANCE RECORDS */}
            {activeTab === 'performance' && (
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <h3 className="font-bold text-slate-900 text-lg mb-2">Lessons & Performance Records</h3>
                <p className="text-xs text-slate-500 mb-6">Sunday bible verse recitations, quizzes, and classroom performance scores recorded by teachers.</p>

                {children.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">Please register children to view feedback scores.</div>
                ) : (
                  <div className="space-y-6">
                    {children.map(c => {
                      const childPerf = performance.filter(p => p.childId === c.id);
                      return (
                        <div key={c.id} className="border-b border-slate-100 pb-6 last:border-0 last:pb-0">
                          <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span> {c.fullName}
                          </h4>
                          
                          {childPerf.length === 0 ? (
                            <p className="text-xs text-slate-500 italic pl-4">No performance evaluations recorded yet.</p>
                          ) : (
                            <div className="space-y-3 pl-4">
                              {childPerf.map(p => {
                                const subj = subjects.find(s => s.id === p.subjectId);
                                return (
                                  <div key={p.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div className="space-y-0.5">
                                      <p className="text-xs font-bold text-slate-800">
                                        Subject: {subj ? subj.name : 'General Bible Study'}
                                      </p>
                                      {p.notes && <p className="text-xs text-slate-600 italic">"{p.notes}"</p>}
                                      <p className="text-[10px] text-slate-400">
                                        Recorded by {p.recordedBy} on {new Date(p.createdAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-2">
                                      <span className="text-xs text-slate-500 uppercase font-semibold">Evaluation:</span>
                                      <span className={`text-sm font-black px-3 py-1 rounded-full ${
                                        p.score >= 80 ? 'bg-emerald-50 text-emerald-800' : p.score >= 50 ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-800'
                                      }`}>
                                        {p.score} / 100
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: UPCOMING LESSONS */}
            {activeTab === 'lessons' && (
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <h3 className="font-bold text-slate-900 text-lg mb-2">Upcoming Bible Lessons</h3>
                <p className="text-xs text-slate-500 mb-6">Weekly curriculum schedule assigned to children's classes.</p>

                {lessons.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">No upcoming lessons scheduled. Check back later!</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lessons.map(l => {
                      const subj = subjects.find(s => s.id === l.subjectId);
                      const cls = classes.find(c => c.id === l.classId);

                      return (
                        <div key={l.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="inline-block bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full mb-1">
                                {subj ? subj.name : 'Bible Study'}
                              </span>
                              <h4 className="font-bold text-slate-900 text-base">{l.topic}</h4>
                            </div>
                            <span className="text-xs font-mono bg-white border border-slate-200 px-2 py-1 rounded text-slate-700 font-semibold shrink-0">
                              {l.lessonDate}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-200/50">
                            <div><span className="font-semibold text-slate-800">Target Sunday Class:</span> {cls ? `${cls.name} (${cls.ageRange})` : 'All'}</div>
                            {l.notes && <div className="text-slate-500 bg-white p-2 rounded border border-slate-100 mt-2 italic font-serif">"{l.notes}"</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: CHAT WITH ADMINS */}
            {activeTab === 'chat' && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[550px]">
                <div className="bg-slate-50 border-b border-slate-100 px-6 py-4">
                  <h3 className="font-bold text-slate-900 text-lg">Sunday School Administration Chat</h3>
                  <p className="text-xs text-slate-500">Need support? Message St Andrew's Sunday School administrators here.</p>
                </div>

                {/* Messages Box */}
                <div className="flex-grow overflow-y-auto p-6 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">
                      <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold">No messages in this thread yet.</p>
                      <p className="text-xs text-slate-400 mt-0.5">Send a greeting message or ask Sunday school leaders any question below.</p>
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isMe = msg.senderId === user.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-2xl p-4 text-sm shadow-sm ${
                            isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-900 rounded-tl-none'
                          }`}>
                            <p className="leading-relaxed">{msg.message}</p>
                            <span className={`block text-[9px] mt-1.5 ${isMe ? 'text-blue-200' : 'text-slate-400'} text-right`}>
                              {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Message input */}
                <form onSubmit={handleSendMessage} className="border-t border-slate-100 p-4 flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message for Sunday school admins..."
                    className="flex-grow px-4 py-2 border border-slate-300 rounded-xl text-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm flex items-center gap-1 shrink-0"
                  >
                    <Send className="w-4 h-4" /> Send
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
