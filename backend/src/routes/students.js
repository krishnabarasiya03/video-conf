const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const ScheduleService = require('../services/scheduleService');

const router = express.Router();
const scheduleService = new ScheduleService();

// GET /api/students/me/schedule - Get student's scheduled classes
router.get('/me/schedule', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const { upcoming, from, to } = req.query;
    const studentId = req.user.uid;

    // Validate date filters if provided
    if (from) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(from)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'from parameter must be in YYYY-MM-DD format'
        });
      }
    }

    if (to) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(to)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'to parameter must be in YYYY-MM-DD format'
        });
      }
    }

    const filters = {
      upcoming: upcoming === 'true',
      from,
      to
    };

    const schedules = await scheduleService.getStudentSchedule(studentId, filters);

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Error fetching student schedule:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch student schedule'
    });
  }
});

// GET /api/students/me/profile - Get student's profile
router.get('/me/profile', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const studentId = req.user.uid;

    // Get student's profile (already available in req.user from auth middleware)
    const profile = {
      id: req.user.uid,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      createdAt: req.user.createdAt,
      updatedAt: req.user.updatedAt
    };

    // Get enrollment count
    const enrollmentsSnapshot = await scheduleService.db.collection('enrollments')
      .where('studentId', '==', studentId)
      .get();

    const enrollmentCount = enrollmentsSnapshot.size;

    // Get upcoming classes count
    const today = new Date().toISOString().split('T')[0];
    const upcomingSchedules = await scheduleService.getStudentSchedule(studentId, {
      upcoming: true
    });

    const stats = {
      enrolledCourses: enrollmentCount,
      upcomingClasses: upcomingSchedules.length
    };

    res.json({
      success: true,
      data: {
        profile,
        stats
      }
    });
  } catch (error) {
    console.error('Error fetching student profile:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch student profile'
    });
  }
});

// GET /api/students/me/dashboard - Get student dashboard data
router.get('/me/dashboard', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const studentId = req.user.uid;

    // Get enrolled courses
    const enrollmentsSnapshot = await scheduleService.db.collection('enrollments')
      .where('studentId', '==', studentId)
      .get();

    const courseIds = enrollmentsSnapshot.docs.map(doc => doc.data().courseId);
    
    let courses = [];
    if (courseIds.length > 0) {
      const coursesSnapshot = await scheduleService.db.collection('courses')
        .where('__name__', 'in', courseIds)
        .get();

      courses = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }

    // Get upcoming classes (next 7 days)
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const upcomingSchedules = await scheduleService.getStudentSchedule(studentId, {
      from: today.toISOString().split('T')[0],
      to: nextWeek.toISOString().split('T')[0]
    });

    // Get today's classes
    const todaySchedules = await scheduleService.getStudentSchedule(studentId, {
      from: today.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0]
    });

    const dashboardData = {
      student: {
        id: req.user.uid,
        name: req.user.name,
        email: req.user.email
      },
      stats: {
        enrolledCourses: courses.length,
        upcomingClasses: upcomingSchedules.length,
        todayClasses: todaySchedules.length
      },
      enrolledCourses: courses,
      upcomingClasses: upcomingSchedules.slice(0, 5), // Limit to 5 for dashboard
      todayClasses: todaySchedules
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error fetching student dashboard:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch student dashboard'
    });
  }
});

module.exports = router;