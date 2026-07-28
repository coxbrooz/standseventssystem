import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  dbUsers,
  dbClasses,
  dbSubjects,
  dbLessons,
  dbChildren,
  dbCheckIns,
  dbAttendance,
  dbPerformance,
  dbPickupAudits,
  dbMessages
} from './src/server/db';
import { User, Child } from './src/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware with high limits for base64 child photos
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Helper function to extract user from Authorization header
  function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized. No authorization token.' });
      return;
    }
    const userId = authHeader.split(' ')[1];
    const user = dbUsers.getById(userId);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized. User session not found.' });
      return;
    }
    (req as any).user = user;
    next();
  }

  // --- API ROUTES ---

  // Auth: Register
  app.post('/api/auth/register', (req, res) => {
    const { email, phone, fullName, password, role } = req.body;

    if (!email || !phone || !fullName || !password || !role) {
      res.status(400).json({ error: 'All fields are required.' });
      return;
    }

    const existingUser = dbUsers.getByEmail(email);
    if (existingUser) {
      res.status(400).json({ error: 'Email already registered.' });
      return;
    }

    // Hard limit of 5 admins
    if (role === 'admin') {
      const currentAdmins = dbUsers.getAll().filter(u => u.role === 'admin');
      if (currentAdmins.length >= 5) {
        res.status(400).json({ error: 'Admin limit reached. Maximum of 5 admins is allowed.' });
        return;
      }
    }

    try {
      const newUser = dbUsers.create({
        email,
        phone,
        fullName,
        role,
        approvalStatus: 'pending', // Overridden to 'approved' for first user inside dbUsers.create
        password
      });

      // Omit password before returning
      const { password: _, ...userResponse } = newUser as any;
      res.status(201).json(userResponse);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Auth: Login
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = dbUsers.getByEmail(email);
    if (!user || user.password !== password) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const { password: _, ...userResponse } = user as any;
    res.json(userResponse);
  });

  // Auth: Forgot Password Request (OTP code generation)
  app.post('/api/auth/reset-password-request', (req, res) => {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }

    const user = dbUsers.getByEmail(email);
    if (!user) {
      res.status(404).json({ error: 'User with this email not found.' });
      return;
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    dbUsers.update(user.id, { resetCode });

    // In a real system, we'd email this. We return it so the UI can display/simulate it safely.
    res.json({ success: true, code: resetCode, message: 'Password reset code generated.' });
  });

  // Auth: Forgot Password Verify and Update
  app.post('/api/auth/reset-password-confirm', (req, res) => {
    const { email, resetCode, newPassword } = req.body;
    if (!email || !resetCode || !newPassword) {
      res.status(400).json({ error: 'Email, verification code, and new password are required.' });
      return;
    }

    const user = dbUsers.getByEmail(email);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (user.resetCode !== resetCode) {
      res.status(400).json({ error: 'Invalid verification code.' });
      return;
    }

    dbUsers.update(user.id, {
      password: newPassword,
      resetCode: undefined
    });

    const updatedUser = dbUsers.getById(user.id);
    const { password: _, ...userResponse } = updatedUser as any;
    res.json({ success: true, user: userResponse });
  });

  // Auth: Get current profile
  app.get('/api/auth/me', authenticate, (req, res) => {
    const user = (req as any).user;
    const { password: _, ...userResponse } = user;
    res.json(userResponse);
  });

  // Users Admin Operations (Admins Only)
  app.get('/api/admin/users', authenticate, (req, res) => {
    const caller = (req as any).user;
    if (caller.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden. Admin access required.' });
      return;
    }
    const users = dbUsers.getAll().map(u => {
      const { password: _, ...userResponse } = u as any;
      return userResponse;
    });
    res.json(users);
  });

  app.post('/api/admin/users/:id/approve', authenticate, (req, res) => {
    const caller = (req as any).user;
    if (caller.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden. Admin access required.' });
      return;
    }
    const { id } = req.params;
    const { approvalStatus } = req.body; // 'approved' | 'declined' | 'pending'
    if (!approvalStatus) {
      res.status(400).json({ error: 'Approval status is required.' });
      return;
    }

    const targetUser = dbUsers.getById(id);
    if (!targetUser) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    dbUsers.update(id, { approvalStatus });
    res.json({ success: true, user: dbUsers.getById(id) });
  });

  app.post('/api/admin/users/:id/role', authenticate, (req, res) => {
    const caller = (req as any).user;
    if (caller.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden. Admin access required.' });
      return;
    }
    const { id } = req.params;
    const { role } = req.body;
    if (!role) {
      res.status(400).json({ error: 'Role is required.' });
      return;
    }

    if (role === 'admin') {
      const currentAdmins = dbUsers.getAll().filter(u => u.role === 'admin');
      if (currentAdmins.length >= 5) {
        res.status(400).json({ error: 'Maximum of 5 admins reached.' });
        return;
      }
    }

    dbUsers.update(id, { role });
    res.json({ success: true, user: dbUsers.getById(id) });
  });

  app.delete('/api/admin/users/:id', authenticate, (req, res) => {
    const caller = (req as any).user;
    if (caller.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden. Admin access required.' });
      return;
    }
    const { id } = req.params;
    const success = dbUsers.delete(id);
    if (!success) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.json({ success: true });
  });

  // --- Classes endpoints ---
  app.get('/api/classes', authenticate, (req, res) => {
    res.json(dbClasses.getAll());
  });

  app.post('/api/classes', authenticate, (req, res) => {
    const caller = (req as any).user;
    if (caller.role !== 'admin') {
      res.status(403).json({ error: 'Admin only operation.' });
      return;
    }
    const { name, ageRange, teacherId } = req.body;
    if (!name || !ageRange) {
      res.status(400).json({ error: 'Class name and age range are required.' });
      return;
    }
    const newClass = dbClasses.create({ name, ageRange, teacherId: teacherId || '' });
    res.status(201).json(newClass);
  });

  app.delete('/api/classes/:id', authenticate, (req, res) => {
    const caller = (req as any).user;
    if (caller.role !== 'admin') {
      res.status(403).json({ error: 'Admin only operation.' });
      return;
    }
    const success = dbClasses.delete(req.params.id);
    if (!success) {
      res.status(404).json({ error: 'Class not found.' });
      return;
    }
    res.json({ success: true });
  });

  // --- Subjects endpoints ---
  app.get('/api/subjects', authenticate, (req, res) => {
    res.json(dbSubjects.getAll());
  });

  app.post('/api/subjects', authenticate, (req, res) => {
    const caller = (req as any).user;
    if (caller.role !== 'admin') {
      res.status(403).json({ error: 'Admin only operation.' });
      return;
    }
    const { name, description } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Subject name is required.' });
      return;
    }
    const newSubj = dbSubjects.create({ name, description: description || '' });
    res.status(201).json(newSubj);
  });

  app.delete('/api/subjects/:id', authenticate, (req, res) => {
    const caller = (req as any).user;
    if (caller.role !== 'admin') {
      res.status(403).json({ error: 'Admin only operation.' });
      return;
    }
    const success = dbSubjects.delete(req.params.id);
    if (!success) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }
    res.json({ success: true });
  });

  // --- Lessons endpoints ---
  app.get('/api/lessons', authenticate, (req, res) => {
    res.json(dbLessons.getAll());
  });

  app.post('/api/lessons', authenticate, (req, res) => {
    const caller = (req as any).user;
    if (caller.role !== 'admin') {
      res.status(403).json({ error: 'Admin only operation.' });
      return;
    }
    const { subjectId, classId, topic, lessonDate, notes } = req.body;
    if (!subjectId || !classId || !topic || !lessonDate) {
      res.status(400).json({ error: 'Missing required lesson fields.' });
      return;
    }
    const newLesson = dbLessons.create({ subjectId, classId, topic, lessonDate, notes: notes || '' });
    res.status(201).json(newLesson);
  });

  app.delete('/api/lessons/:id', authenticate, (req, res) => {
    const caller = (req as any).user;
    if (caller.role !== 'admin') {
      res.status(403).json({ error: 'Admin only operation.' });
      return;
    }
    const success = dbLessons.delete(req.params.id);
    if (!success) {
      res.status(404).json({ error: 'Lesson not found.' });
      return;
    }
    res.json({ success: true });
  });

  // --- Children endpoints ---
  app.get('/api/children', authenticate, (req, res) => {
    const caller = (req as any).user;
    if (caller.role === 'parent') {
      res.json(dbChildren.getByParent(caller.id));
    } else {
      res.json(dbChildren.getAll());
    }
  });

  app.post('/api/children', authenticate, (req, res) => {
    const caller = (req as any).user;
    const { fullName, dateOfBirth, classId, allergies, notes, authorizedPickup, photoPath } = req.body;

    if (!fullName || !dateOfBirth || !classId) {
      res.status(400).json({ error: 'Child name, DOB, and Class are required.' });
      return;
    }

    const parentId = caller.role === 'parent' ? caller.id : (req.body.parentId || caller.id);

    const child = dbChildren.create({
      parentId,
      fullName,
      dateOfBirth,
      classId,
      allergies: allergies || '',
      notes: notes || '',
      authorizedPickup: authorizedPickup || '',
      photoPath: photoPath || ''
    });

    res.status(201).json(child);
  });

  app.delete('/api/children/:id', authenticate, (req, res) => {
    const caller = (req as any).user;
    const child = dbChildren.getById(req.params.id);
    if (!child) {
      res.status(404).json({ error: 'Child not found.' });
      return;
    }
    if (caller.role === 'parent' && child.parentId !== caller.id) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }
    dbChildren.delete(req.params.id);
    res.json({ success: true });
  });

  // --- Check-ins endpoints ---
  app.get('/api/check-ins', authenticate, (req, res) => {
    res.json(dbCheckIns.getAll());
  });

  app.post('/api/check-ins', authenticate, (req, res) => {
    const { childIds } = req.body;
    if (!childIds || !Array.isArray(childIds) || childIds.length === 0) {
      res.status(400).json({ error: 'childIds must be an array of IDs.' });
      return;
    }

    // Today's local date YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0];
    const results: any[] = [];

    for (const childId of childIds) {
      const child = dbChildren.getById(childId);
      if (!child) continue;

      // Check if already checked in today
      const existing = dbCheckIns.getByChildAndDate(childId, todayStr);
      if (existing) {
        results.push(existing);
      } else {
        // Generate a 6 digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const newCheckIn = dbCheckIns.create({
          childId,
          checkInDate: todayStr,
          pickupCode: code,
          checkedInAt: new Date().toISOString()
        });
        results.push(newCheckIn);
      }
    }

    res.status(201).json(results);
  });

  // --- Attendance endpoints ---
  app.get('/api/attendance', authenticate, (req, res) => {
    res.json(dbAttendance.getAll());
  });

  app.post('/api/attendance/batch', authenticate, (req, res) => {
    const { date, classId, records } = req.body;
    if (!date || !classId || !records || !Array.isArray(records)) {
      res.status(400).json({ error: 'date, classId, and records array are required.' });
      return;
    }

    const saved: any[] = [];
    for (const r of records) {
      const entry = dbAttendance.upsert({
        childId: r.childId,
        classId,
        date,
        status: r.status
      });
      saved.push(entry);
    }
    res.json({ success: true, count: saved.length });
  });

  // --- Performance endpoints ---
  app.get('/api/performance', authenticate, (req, res) => {
    const { childId } = req.query;
    if (childId) {
      res.json(dbPerformance.getByChild(childId as string));
    } else {
      res.json(dbPerformance.getAll());
    }
  });

  app.post('/api/performance', authenticate, (req, res) => {
    const caller = (req as any).user;
    const { childId, subjectId, score, notes } = req.body;
    if (!childId || !subjectId || score === undefined) {
      res.status(400).json({ error: 'childId, subjectId, and score are required.' });
      return;
    }

    const record = dbPerformance.create({
      childId,
      subjectId,
      score: Number(score),
      notes: notes || '',
      recordedBy: caller.fullName || caller.email
    });

    res.status(201).json(record);
  });

  // --- Pickup verification endpoint ---
  app.post('/api/pickup/verify', authenticate, (req, res) => {
    const caller = (req as any).user;
    const { childId, enteredCode } = req.body;

    if (!childId || !enteredCode) {
      res.status(400).json({ error: 'childId and enteredCode are required.' });
      return;
    }

    const child = dbChildren.getById(childId);
    const childName = child ? child.fullName : 'Unknown Child';
    const teacherName = caller.fullName || caller.email;

    const todayStr = new Date().toISOString().split('T')[0];
    const checkIn = dbCheckIns.getByChildAndDate(childId, todayStr);

    if (!checkIn) {
      // Log failure in audit trail
      dbPickupAudits.create({
        childId,
        enteredCode,
        success: false,
        reason: 'Child was not checked in today',
        teacherId: caller.id,
        teacherNameSnapshot: teacherName,
        childNameSnapshot: childName
      });
      res.status(400).json({ success: false, error: 'Child is not checked in today.' });
      return;
    }

    if (checkIn.checkedOutAt) {
      dbPickupAudits.create({
        childId,
        enteredCode,
        success: false,
        reason: 'Child was already picked up',
        teacherId: caller.id,
        teacherNameSnapshot: teacherName,
        childNameSnapshot: childName
      });
      res.status(400).json({ success: false, error: 'Child was already dismissed/picked up today.' });
      return;
    }

    if (checkIn.pickupCode !== enteredCode) {
      dbPickupAudits.create({
        childId,
        enteredCode,
        success: false,
        reason: 'Incorrect daily pickup code entered',
        teacherId: caller.id,
        teacherNameSnapshot: teacherName,
        childNameSnapshot: childName
      });
      res.status(400).json({ success: false, error: 'Incorrect pickup code.' });
      return;
    }

    // Success! Update check-in record
    dbCheckIns.update(checkIn.id, { checkedOutAt: new Date().toISOString() });

    // Log success in audit trail
    dbPickupAudits.create({
      childId,
      enteredCode,
      success: true,
      reason: 'Verified successfully',
      teacherId: caller.id,
      teacherNameSnapshot: teacherName,
      childNameSnapshot: childName
    });

    res.json({ success: true, message: 'Pickup code verified successfully. Child is cleared for dismissal!' });
  });

  // Get pickup audit log (Admins Only)
  app.get('/api/pickup/audits', authenticate, (req, res) => {
    const caller = (req as any).user;
    if (caller.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required.' });
      return;
    }
    res.json(dbPickupAudits.getAll());
  });

  // --- Messages / Chat endpoints ---
  app.get('/api/messages', authenticate, (req, res) => {
    const caller = (req as any).user;
    const allMsgs = dbMessages.getAll();

    if (caller.role === 'parent') {
      // Parents only see messages to/from admins concerning their parentId
      const parentMsgs = allMsgs.filter(m => m.parentId === caller.id);
      res.json(parentMsgs);
    } else {
      // Admins (and teachers if allowed) see all messages
      res.json(allMsgs);
    }
  });

  app.post('/api/messages', authenticate, (req, res) => {
    const caller = (req as any).user;
    const { parentId, adminId, message } = req.body;

    if (!message) {
      res.status(400).json({ error: 'Message content is required.' });
      return;
    }

    let finalParentId = parentId;
    let finalAdminId = adminId;

    if (caller.role === 'parent') {
      finalParentId = caller.id;
      // Default adminId to any admin, or empty
      if (!finalAdminId) {
        const firstAdmin = dbUsers.getAll().find(u => u.role === 'admin');
        finalAdminId = firstAdmin ? firstAdmin.id : 'system-admin';
      }
    } else if (caller.role === 'admin') {
      finalAdminId = caller.id;
      if (!finalParentId) {
        res.status(400).json({ error: 'parentId is required when admin sends a message.' });
        return;
      }
    } else {
      res.status(403).json({ error: 'Teachers are not authorized to participate in parent-admin chats.' });
      return;
    }

    const newMsg = dbMessages.create({
      parentId: finalParentId,
      adminId: finalAdminId,
      senderId: caller.id,
      message
    });

    res.status(201).json(newMsg);
  });

  // --- INTEGRATION WITH VITE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start full-stack server', err);
});
