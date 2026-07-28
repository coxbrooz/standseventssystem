export type UserRole = 'parent' | 'teacher' | 'admin';
export type ApprovalStatus = 'pending' | 'approved' | 'declined';

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  approvalStatus: ApprovalStatus;
  role: UserRole;
  createdAt: string;
  password?: string; // only handled in DB, omitted in responses
  resetCode?: string; // used for OTP flow
}

export interface Class {
  id: string;
  name: string;
  ageRange: string;
  teacherId: string; // User ID of the teacher
}

export interface Subject {
  id: string;
  name: string;
  description: string;
}

export interface Lesson {
  id: string;
  subjectId: string;
  classId: string;
  topic: string;
  lessonDate: string; // YYYY-MM-DD
  notes: string;
}

export interface Child {
  id: string;
  parentId: string;
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD
  classId: string;
  allergies: string;
  notes: string;
  authorizedPickup: string; // comma separated names
  photoPath?: string; // Base64 or standard string placeholder
}

export interface CheckIn {
  id: string;
  childId: string;
  checkInDate: string; // YYYY-MM-DD
  pickupCode: string; // 6 digits
  checkedInAt: string; // ISO string
  checkedOutAt?: string; // ISO string
}

export interface Attendance {
  id: string;
  childId: string;
  classId: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent';
}

export interface PerformanceRecord {
  id: string;
  childId: string;
  subjectId: string;
  score: number; // 0 to 100
  notes: string;
  recordedBy: string; // Teacher's name or ID
  createdAt: string; // ISO string
}

export interface PickupAudit {
  id: string;
  childId: string;
  enteredCode: string;
  success: boolean;
  reason: string;
  teacherId: string;
  teacherNameSnapshot: string;
  childNameSnapshot: string;
  createdAt: string; // ISO string
}

export interface Message {
  id: string;
  parentId: string;
  adminId: string;
  senderId: string; // either parentId or adminId
  message: string;
  sentAt: string; // ISO string
}

// Full schema structure of our local database file
export interface ChurchDatabase {
  users: User[];
  classes: Class[];
  subjects: Subject[];
  lessons: Lesson[];
  children: Child[];
  checkIns: CheckIn[];
  attendance: Attendance[];
  performanceRecords: PerformanceRecord[];
  pickupAudits: PickupAudit[];
  messages: Message[];
}
