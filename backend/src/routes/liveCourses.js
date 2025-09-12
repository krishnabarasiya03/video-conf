const express = require('express');
const { getFirestore } = require('../config/firebase');

const router = express.Router();
const db = getFirestore();

/**
 * GET /api/live-courses
 * Fetch live courses data from Firebase
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0, status = 'active' } = req.query;

    // Validate parameters
    const parsedLimit = Math.min(Math.max(parseInt(limit), 1), 100);
    const parsedOffset = Math.max(parseInt(offset) || 0, 0);

    // Query live courses from Firestore
    let query = db.collection('live-courses');
    
    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }

    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .limit(parsedLimit)
      .offset(parsedOffset)
      .get();

    const courses = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      courses.push({
        id: doc.id,
        title: data.title,
        description: data.description,
        instructorName: data.instructorName,
        instructorId: data.instructorId,
        status: data.status,
        scheduledTime: data.scheduledTime,
        duration: data.duration,
        maxParticipants: data.maxParticipants,
        currentParticipants: data.currentParticipants || 0,
        roomId: data.roomId,
        category: data.category,
        tags: data.tags || [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      });
    });

    res.json({
      success: true,
      data: {
        courses,
        pagination: {
          limit: parsedLimit,
          offset: parsedOffset,
          count: courses.length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching live courses:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch live courses'
    });
  }
});

/**
 * GET /api/live-courses/:id
 * Fetch specific live course by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Course ID is required'
      });
    }

    // Get course document
    const courseDoc = await db.collection('live-courses').doc(id).get();

    if (!courseDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Live course not found'
      });
    }

    const courseData = courseDoc.data();
    
    // Get enrolled participants if available
    const participantsSnapshot = await db.collection('live-courses')
      .doc(id)
      .collection('participants')
      .get();

    const participants = [];
    participantsSnapshot.forEach(doc => {
      const data = doc.data();
      participants.push({
        userId: doc.id,
        name: data.name,
        email: data.email,
        joinedAt: data.joinedAt,
        role: data.role || 'student'
      });
    });

    const course = {
      id: courseDoc.id,
      title: courseData.title,
      description: courseData.description,
      instructorName: courseData.instructorName,
      instructorId: courseData.instructorId,
      status: courseData.status,
      scheduledTime: courseData.scheduledTime,
      duration: courseData.duration,
      maxParticipants: courseData.maxParticipants,
      currentParticipants: participants.length,
      roomId: courseData.roomId,
      category: courseData.category,
      tags: courseData.tags || [],
      createdAt: courseData.createdAt,
      updatedAt: courseData.updatedAt,
      participants
    };

    res.json({
      success: true,
      data: course
    });

  } catch (error) {
    console.error('Error fetching live course:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch live course'
    });
  }
});

/**
 * POST /api/live-courses
 * Create a new live course
 */
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      instructorName,
      instructorId,
      scheduledTime,
      duration,
      maxParticipants = 50,
      category,
      tags = []
    } = req.body;

    // Validate required fields
    if (!title || !description || !instructorName || !instructorId || !scheduledTime) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: title, description, instructorName, instructorId, scheduledTime'
      });
    }

    const now = new Date().toISOString();
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const courseData = {
      title,
      description,
      instructorName,
      instructorId,
      status: 'scheduled',
      scheduledTime,
      duration: duration || 60, // default 60 minutes
      maxParticipants,
      currentParticipants: 0,
      roomId,
      category: category || 'general',
      tags,
      createdAt: now,
      updatedAt: now
    };

    // Create course document
    const courseRef = await db.collection('live-courses').add(courseData);

    res.status(201).json({
      success: true,
      data: {
        id: courseRef.id,
        ...courseData
      }
    });

  } catch (error) {
    console.error('Error creating live course:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create live course'
    });
  }
});

/**
 * PUT /api/live-courses/:id/join
 * Join a live course
 */
router.put('/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, name, email } = req.body;

    if (!userId || !name) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'userId and name are required'
      });
    }

    // Check if course exists
    const courseDoc = await db.collection('live-courses').doc(id).get();
    if (!courseDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Live course not found'
      });
    }

    const courseData = courseDoc.data();

    // Check if course is joinable
    if (courseData.status !== 'active' && courseData.status !== 'scheduled') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Course is not available for joining'
      });
    }

    // Check participant limit
    const participantsSnapshot = await db.collection('live-courses')
      .doc(id)
      .collection('participants')
      .get();

    if (participantsSnapshot.size >= courseData.maxParticipants) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Course is full'
      });
    }

    // Add participant
    const participantData = {
      name,
      email: email || `${userId}@example.com`,
      joinedAt: new Date().toISOString(),
      role: 'student'
    };

    await db.collection('live-courses')
      .doc(id)
      .collection('participants')
      .doc(userId)
      .set(participantData);

    // Update course participant count
    await db.collection('live-courses').doc(id).update({
      currentParticipants: participantsSnapshot.size + 1,
      updatedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        message: 'Successfully joined the course',
        roomId: courseData.roomId
      }
    });

  } catch (error) {
    console.error('Error joining live course:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to join live course'
    });
  }
});

/**
 * PUT /api/live-courses/:id/status
 * Update course status (start, end, etc.)
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['scheduled', 'active', 'ended', 'cancelled'].includes(status)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Valid status is required: scheduled, active, ended, cancelled'
      });
    }

    // Check if course exists
    const courseDoc = await db.collection('live-courses').doc(id).get();
    if (!courseDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Live course not found'
      });
    }

    // Update course status
    await db.collection('live-courses').doc(id).update({
      status,
      updatedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        message: `Course status updated to ${status}`
      }
    });

  } catch (error) {
    console.error('Error updating course status:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update course status'
    });
  }
});

module.exports = router;