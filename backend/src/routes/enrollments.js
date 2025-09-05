const express = require('express');
const { getFirestore } = require('../config/firebase');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const db = getFirestore();

// POST /api/courses/:courseId/enroll - Enroll student in course
router.post('/:courseId/enroll', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.uid;

    // Check if course exists
    const courseDoc = await db.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Course not found'
      });
    }

    // Check if student is already enrolled
    const existingEnrollment = await db.collection('enrollments')
      .where('studentId', '==', studentId)
      .where('courseId', '==', courseId)
      .get();

    if (!existingEnrollment.empty) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Student is already enrolled in this course'
      });
    }

    // Create enrollment
    const enrollmentData = {
      studentId,
      courseId,
      enrolledAt: new Date().toISOString()
    };

    const docRef = await db.collection('enrollments').add(enrollmentData);

    const enrollment = {
      id: docRef.id,
      ...enrollmentData
    };

    res.status(201).json({
      success: true,
      data: enrollment,
      message: 'Successfully enrolled in course'
    });
  } catch (error) {
    console.error('Error enrolling student:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to enroll in course'
    });
  }
});

// GET /api/enrollments - Get enrollments (with filters)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { studentId, courseId, limit = 50 } = req.query;
    
    let enrollmentsRef = db.collection('enrollments');
    
    // Filter by student (students can only see their own enrollments)
    if (req.user.role === 'student') {
      enrollmentsRef = enrollmentsRef.where('studentId', '==', req.user.uid);
    } else if (studentId) {
      enrollmentsRef = enrollmentsRef.where('studentId', '==', studentId);
    }
    
    // Filter by course
    if (courseId) {
      enrollmentsRef = enrollmentsRef.where('courseId', '==', courseId);
    }
    
    // Apply limit
    enrollmentsRef = enrollmentsRef.limit(parseInt(limit));
    
    const snapshot = await enrollmentsRef.orderBy('enrolledAt', 'desc').get();
    
    const enrollments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Optionally populate course and student details
    if (enrollments.length > 0 && req.query.populate === 'true') {
      const courseIds = [...new Set(enrollments.map(e => e.courseId))];
      const studentIds = [...new Set(enrollments.map(e => e.studentId))];

      // Get course details
      const coursesSnapshot = await db.collection('courses')
        .where('__name__', 'in', courseIds)
        .get();
      
      const coursesMap = new Map();
      coursesSnapshot.docs.forEach(doc => {
        coursesMap.set(doc.id, { id: doc.id, ...doc.data() });
      });

      // Get student details (if user is teacher)
      let studentsMap = new Map();
      if (req.user.role === 'teacher') {
        const studentsSnapshot = await db.collection('users')
          .where('__name__', 'in', studentIds)
          .where('role', '==', 'student')
          .get();
        
        studentsSnapshot.docs.forEach(doc => {
          const studentData = doc.data();
          studentsMap.set(doc.id, {
            id: doc.id,
            name: studentData.name,
            email: studentData.email
          });
        });
      }

      // Populate enrollment data
      enrollments.forEach(enrollment => {
        enrollment.course = coursesMap.get(enrollment.courseId);
        if (req.user.role === 'teacher') {
          enrollment.student = studentsMap.get(enrollment.studentId);
        }
      });
    }

    res.json({
      success: true,
      data: enrollments
    });
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch enrollments'
    });
  }
});

// GET /api/enrollments/my-courses - Get student's enrolled courses
router.get('/my-courses', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const studentId = req.user.uid;

    // Get student's enrollments
    const enrollmentsSnapshot = await db.collection('enrollments')
      .where('studentId', '==', studentId)
      .get();

    if (enrollmentsSnapshot.empty) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Get course IDs
    const courseIds = enrollmentsSnapshot.docs.map(doc => doc.data().courseId);

    // Get course details
    const coursesSnapshot = await db.collection('courses')
      .where('__name__', 'in', courseIds)
      .get();

    const courses = coursesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      data: courses
    });
  } catch (error) {
    console.error('Error fetching student courses:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch enrolled courses'
    });
  }
});

// DELETE /api/enrollments/:id - Unenroll student (student or teacher who owns course)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get enrollment
    const enrollmentDoc = await db.collection('enrollments').doc(id).get();
    if (!enrollmentDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Enrollment not found'
      });
    }

    const enrollmentData = enrollmentDoc.data();

    // Check permissions
    let canDelete = false;
    
    if (req.user.role === 'student' && enrollmentData.studentId === req.user.uid) {
      canDelete = true;
    } else if (req.user.role === 'teacher') {
      // Check if teacher owns the course
      const courseDoc = await db.collection('courses').doc(enrollmentData.courseId).get();
      if (courseDoc.exists && courseDoc.data().createdBy === req.user.uid) {
        canDelete = true;
      }
    }

    if (!canDelete) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only unenroll from your own courses or courses you teach'
      });
    }

    // Delete enrollment
    await db.collection('enrollments').doc(id).delete();

    res.json({
      success: true,
      message: 'Successfully unenrolled from course'
    });
  } catch (error) {
    console.error('Error deleting enrollment:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to unenroll from course'
    });
  }
});

// GET /api/courses/:courseId/enrollments - Get enrollments for a specific course (teacher only)
router.get('/course/:courseId', authenticateToken, requireRole('teacher'), async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check if course exists and teacher owns it
    const courseDoc = await db.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Course not found'
      });
    }

    if (courseDoc.data().createdBy !== req.user.uid) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only view enrollments for courses you created'
      });
    }

    // Get enrollments for the course
    const enrollmentsSnapshot = await db.collection('enrollments')
      .where('courseId', '==', courseId)
      .orderBy('enrolledAt', 'desc')
      .get();

    const enrollments = enrollmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get student details
    if (enrollments.length > 0) {
      const studentIds = enrollments.map(e => e.studentId);
      const studentsSnapshot = await db.collection('users')
        .where('__name__', 'in', studentIds)
        .where('role', '==', 'student')
        .get();

      const studentsMap = new Map();
      studentsSnapshot.docs.forEach(doc => {
        const studentData = doc.data();
        studentsMap.set(doc.id, {
          id: doc.id,
          name: studentData.name,
          email: studentData.email
        });
      });

      // Add student details to enrollments
      enrollments.forEach(enrollment => {
        enrollment.student = studentsMap.get(enrollment.studentId);
      });
    }

    res.json({
      success: true,
      data: enrollments
    });
  } catch (error) {
    console.error('Error fetching course enrollments:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch course enrollments'
    });
  }
});

module.exports = router;