import fs from 'fs';
import path from 'path';
import { ChurchDatabase, User, Class, Subject, Lesson, Child, CheckIn, Attendance, PerformanceRecord, PickupAudit, Message } from '../types';

const DB_PATH = path.join(process.cwd(), 'church_db.json');

const INITIAL_DB: ChurchDatabase = {
  users: [],
  classes: [],
  subjects: [],
  lessons: [],
  children: [],
  checkIns: [],
  attendance: [],
  performanceRecords: [],
  pickupAudits: [],
  messages: []
};

// Helper to load database
export function loadDB(): ChurchDatabase {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(INITIAL_DB, null, 2), 'utf-8');
      return INITIAL_DB;
    }
    const content = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(content) as ChurchDatabase;
  } catch (error) {
    console.error('Failed to load database, returning empty', error);
    return INITIAL_DB;
  }
}

// Helper to save database
export function saveDB(db: ChurchDatabase): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save database', error);
  }
}

// Generate an ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// User methods
export const dbUsers = {
  getAll: (): User[] => {
    return loadDB().users;
  },
  
  getById: (id: string): User | undefined => {
    return loadDB().users.find(u => u.id === id);
  },
  
  getByEmail: (email: string): User | undefined => {
    return loadDB().users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },
  
  create: (user: Omit<User, 'id' | 'createdAt'> & { password?: string }): User => {
    const db = loadDB();
    const isFirstUser = db.users.length === 0;
    
    // Founding admin rule
    const role = isFirstUser ? 'admin' : user.role;
    const approvalStatus = isFirstUser ? 'approved' : 'pending';
    
    const newUser: User = {
      ...user,
      id: generateId(),
      role,
      approvalStatus,
      createdAt: new Date().toISOString()
    };
    
    db.users.push(newUser);
    saveDB(db);
    return newUser;
  },
  
  update: (id: string, updates: Partial<User>): User | undefined => {
    const db = loadDB();
    const idx = db.users.findIndex(u => u.id === id);
    if (idx === -1) return undefined;
    
    db.users[idx] = { ...db.users[idx], ...updates };
    saveDB(db);
    return db.users[idx];
  },

  delete: (id: string): boolean => {
    const db = loadDB();
    const filtered = db.users.filter(u => u.id !== id);
    if (filtered.length === db.users.length) return false;
    db.users = filtered;
    saveDB(db);
    return true;
  }
};

// Classes methods
export const dbClasses = {
  getAll: (): Class[] => {
    return loadDB().classes;
  },
  getById: (id: string): Class | undefined => {
    return loadDB().classes.find(c => c.id === id);
  },
  create: (item: Omit<Class, 'id'>): Class => {
    const db = loadDB();
    const newItem: Class = { ...item, id: generateId() };
    db.classes.push(newItem);
    saveDB(db);
    return newItem;
  },
  delete: (id: string): boolean => {
    const db = loadDB();
    const filtered = db.classes.filter(c => c.id !== id);
    if (filtered.length === db.classes.length) return false;
    db.classes = filtered;
    saveDB(db);
    return true;
  }
};

// Subjects methods
export const dbSubjects = {
  getAll: (): Subject[] => {
    return loadDB().subjects;
  },
  getById: (id: string): Subject | undefined => {
    return loadDB().subjects.find(s => s.id === id);
  },
  create: (item: Omit<Subject, 'id'>): Subject => {
    const db = loadDB();
    const newItem: Subject = { ...item, id: generateId() };
    db.subjects.push(newItem);
    saveDB(db);
    return newItem;
  },
  delete: (id: string): boolean => {
    const db = loadDB();
    const filtered = db.subjects.filter(s => s.id !== id);
    if (filtered.length === db.subjects.length) return false;
    db.subjects = filtered;
    saveDB(db);
    return true;
  }
};

// Lessons methods
export const dbLessons = {
  getAll: (): Lesson[] => {
    return loadDB().lessons;
  },
  create: (item: Omit<Lesson, 'id'>): Lesson => {
    const db = loadDB();
    const newItem: Lesson = { ...item, id: generateId() };
    db.lessons.push(newItem);
    saveDB(db);
    return newItem;
  },
  delete: (id: string): boolean => {
    const db = loadDB();
    const filtered = db.lessons.filter(l => l.id !== id);
    if (filtered.length === db.lessons.length) return false;
    db.lessons = filtered;
    saveDB(db);
    return true;
  }
};

// Children methods
export const dbChildren = {
  getAll: (): Child[] => {
    return loadDB().children;
  },
  getByParent: (parentId: string): Child[] => {
    return loadDB().children.filter(c => c.parentId === parentId);
  },
  getById: (id: string): Child | undefined => {
    return loadDB().children.find(c => c.id === id);
  },
  create: (item: Omit<Child, 'id'>): Child => {
    const db = loadDB();
    const newItem: Child = { ...item, id: generateId() };
    db.children.push(newItem);
    saveDB(db);
    return newItem;
  },
  update: (id: string, updates: Partial<Child>): Child | undefined => {
    const db = loadDB();
    const idx = db.children.findIndex(c => c.id === id);
    if (idx === -1) return undefined;
    db.children[idx] = { ...db.children[idx], ...updates };
    saveDB(db);
    return db.children[idx];
  },
  delete: (id: string): boolean => {
    const db = loadDB();
    const filtered = db.children.filter(c => c.id !== id);
    if (filtered.length === db.children.length) return false;
    db.children = filtered;
    saveDB(db);
    return true;
  }
};

// CheckIn methods
export const dbCheckIns = {
  getAll: (): CheckIn[] => {
    return loadDB().checkIns;
  },
  getByChildAndDate: (childId: string, date: string): CheckIn | undefined => {
    return loadDB().checkIns.find(c => c.childId === childId && c.checkInDate === date);
  },
  create: (item: Omit<CheckIn, 'id'>): CheckIn => {
    const db = loadDB();
    const newItem: CheckIn = { ...item, id: generateId() };
    db.checkIns.push(newItem);
    saveDB(db);
    return newItem;
  },
  update: (id: string, updates: Partial<CheckIn>): CheckIn | undefined => {
    const db = loadDB();
    const idx = db.checkIns.findIndex(c => c.id === id);
    if (idx === -1) return undefined;
    db.checkIns[idx] = { ...db.checkIns[idx], ...updates };
    saveDB(db);
    return db.checkIns[idx];
  }
};

// Attendance methods
export const dbAttendance = {
  getAll: (): Attendance[] => {
    return loadDB().attendance;
  },
  getByChildAndDate: (childId: string, date: string): Attendance | undefined => {
    return loadDB().attendance.find(a => a.childId === childId && a.date === date);
  },
  upsert: (item: Omit<Attendance, 'id'>): Attendance => {
    const db = loadDB();
    const idx = db.attendance.findIndex(a => a.childId === item.childId && a.date === item.date);
    if (idx !== -1) {
      db.attendance[idx] = { ...db.attendance[idx], ...item };
      saveDB(db);
      return db.attendance[idx];
    } else {
      const newItem: Attendance = { ...item, id: generateId() };
      db.attendance.push(newItem);
      saveDB(db);
      return newItem;
    }
  }
};

// Performance records methods
export const dbPerformance = {
  getAll: (): PerformanceRecord[] => {
    return loadDB().performanceRecords;
  },
  getByChild: (childId: string): PerformanceRecord[] => {
    return loadDB().performanceRecords.filter(p => p.childId === childId);
  },
  create: (item: Omit<PerformanceRecord, 'id' | 'createdAt'>): PerformanceRecord => {
    const db = loadDB();
    const newItem: PerformanceRecord = {
      ...item,
      id: generateId(),
      createdAt: new Date().toISOString()
    };
    db.performanceRecords.push(newItem);
    saveDB(db);
    return newItem;
  },
  delete: (id: string): boolean => {
    const db = loadDB();
    const filtered = db.performanceRecords.filter(p => p.id !== id);
    if (filtered.length === db.performanceRecords.length) return false;
    db.performanceRecords = filtered;
    saveDB(db);
    return true;
  }
};

// Pickup Audits methods
export const dbPickupAudits = {
  getAll: (): PickupAudit[] => {
    return loadDB().pickupAudits;
  },
  create: (item: Omit<PickupAudit, 'id' | 'createdAt'>): PickupAudit => {
    const db = loadDB();
    const newItem: PickupAudit = {
      ...item,
      id: generateId(),
      createdAt: new Date().toISOString()
    };
    db.pickupAudits.push(newItem);
    saveDB(db);
    return newItem;
  }
};

// Messages methods
export const dbMessages = {
  getAll: (): Message[] => {
    return loadDB().messages;
  },
  create: (item: Omit<Message, 'id' | 'sentAt'>): Message => {
    const db = loadDB();
    const newItem: Message = {
      ...item,
      id: generateId(),
      sentAt: new Date().toISOString()
    };
    db.messages.push(newItem);
    saveDB(db);
    return newItem;
  }
};
