const express = require('express');
const { authenticateToken, requireRole, requireStudentOrTeacher } = require('../middleware/auth');
const ScheduleService = require('../services/scheduleService');

const router = express.Router();
const scheduleService = new ScheduleService();

// POST /api/schedules - Create a new schedule (teacher only)
router.post('/', authenticateToken, requireRole('teacher'), async (req, res) => {
  try {
    const { courseId, date, time, durationMinutes } = req.body;

    // Validate input
    if (!courseId || !date || !time || !durationMinutes) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'courseId, date, time, and durationMinutes are required'
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Date must be in YYYY-MM-DD format'
      });
    }

    // Validate time format (HH:mm)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Time must be in HH:mm format (24-hour)'
      });
    }

    // Validate duration
    const duration = parseInt(durationMinutes);
    if (isNaN(duration) || duration <= 0 || duration > 480) { // Max 8 hours
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Duration must be a positive number (max 480 minutes)'
      });
    }

    const scheduleData = {
      courseId,
      teacherId: req.user.uid,
      date,
      time,
      durationMinutes: duration
    };

    const schedule = await scheduleService.createSchedule(scheduleData);

    res.status(201).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Error creating schedule:', error);
    
    if (error.message.includes('Course not found')) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }
    
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create schedule'
    });
  }
});

// GET /api/schedules - Get schedules (with filters)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { teacherId, courseId, date, upcoming, limit = 50 } = req.query;
    
    // For students, redirect to their personal schedule endpoint
    if (req.user.role === 'student') {
      return res.redirect('/api/students/me/schedule?' + new URLSearchParams(req.query));
    }

    // Teachers can see all schedules or filter by their own
    let schedules;
    if (req.user.role === 'teacher') {
      const filterTeacherId = teacherId || req.user.uid;
      schedules = await scheduleService.getTeacherSchedules(filterTeacherId);
      
      // Apply additional filters
      if (courseId) {
        schedules = schedules.filter(s => s.courseId === courseId);
      }
      
      if (date) {
        schedules = schedules.filter(s => s.date === date);
      }
      
      if (upcoming === 'true') {
        const today = new Date().toISOString().split('T')[0];
        schedules = schedules.filter(s => s.date >= today);
      }
      
      // Apply limit
      schedules = schedules.slice(0, parseInt(limit));
    }

    res.json({
      success: true,
      data: schedules || []
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch schedules'
    });
  }
});

// GET /api/schedules/:roomId - Get schedule by room ID
router.get('/:roomId', authenticateToken, requireStudentOrTeacher, async (req, res) => {
  try {
    const { roomId } = req.params;

    // Get schedule
    const schedule = await scheduleService.getScheduleByRoomId(roomId);

    // Check if user can access this room
    const canAccess = await scheduleService.canUserAccessRoom(
      req.user.uid,
      roomId,
      req.user.role
    );

    if (!canAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this class'
      });
    }

    // Get enrolled students if user is teacher and owns the course
    let participants = null;
    if (req.user.role === 'teacher' && schedule.teacherId === req.user.uid) {
      try {
        participants = await scheduleService.getEnrolledStudents(schedule.courseId);
      } catch (error) {
        console.warn('Could not fetch participants:', error.message);
      }
    }

    const response = {
      success: true,
      data: {
        schedule,
        participants
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    
    if (error.message.includes('Schedule not found')) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Schedule not found'
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch schedule'
    });
  }
});

// PUT /api/schedules/:id - Update schedule (teacher who created it only)
router.put('/:id', authenticateToken, requireRole('teacher'), async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time, durationMinutes } = req.body;

    // Get existing schedule
    const scheduleDoc = await scheduleService.db.collection('schedules').doc(id).get();
    
    if (!scheduleDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Schedule not found'
      });
    }

    const scheduleData = scheduleDoc.data();
    
    // Check if user owns the schedule
    if (scheduleData.teacherId !== req.user.uid) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update schedules you created'
      });
    }

    // Validate input if provided
    const updateData = {
      updatedAt: new Date().toISOString()
    };

    if (date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Date must be in YYYY-MM-DD format'
        });
      }
      updateData.date = date;
    }

    if (time) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(time)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Time must be in HH:mm format (24-hour)'
        });
      }
      updateData.time = time;
    }

    if (durationMinutes) {
      const duration = parseInt(durationMinutes);
      if (isNaN(duration) || duration <= 0 || duration > 480) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Duration must be a positive number (max 480 minutes)'
        });
      }
      updateData.durationMinutes = duration;
    }

    // Update schedule
    await scheduleService.db.collection('schedules').doc(id).update(updateData);

    const updatedSchedule = {
      id,
      ...scheduleData,
      ...updateData
    };

    res.json({
      success: true,
      data: updatedSchedule
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update schedule'
    });
  }
});

// DELETE /api/schedules/:id - Delete schedule (teacher who created it only)
router.delete('/:id', authenticateToken, requireRole('teacher'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get existing schedule
    const scheduleDoc = await scheduleService.db.collection('schedules').doc(id).get();
    
    if (!scheduleDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Schedule not found'
      });
    }

    const scheduleData = scheduleDoc.data();
    
    // Check if user owns the schedule
    if (scheduleData.teacherId !== req.user.uid) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete schedules you created'
      });
    }

    // Delete schedule
    await scheduleService.db.collection('schedules').doc(id).delete();

    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete schedule'
    });
  }
});

module.exports = router;