const express = require('express');
const { getFirestore } = require('../config/firebase');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const db = getFirestore();

// POST /api/courses - Create a new course (teacher only)
router.post('/', authenticateToken, requireRole('teacher'), async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Course name is required and must be a non-empty string'
      });
    }

    const courseData = {
      name: name.trim(),
      description: description ? description.trim() : '',
      createdBy: req.user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Create course in Firestore
    const docRef = await db.collection('courses').add(courseData);

    const newCourse = {
      id: docRef.id,
      ...courseData
    };

    res.status(201).json({
      success: true,
      data: newCourse
    });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create course'
    });
  }
});

// GET /api/courses - Get all courses (authenticated users)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { createdBy, limit = 50 } = req.query;
    
    let coursesRef = db.collection('courses');
    
    // Filter by creator if specified
    if (createdBy) {
      coursesRef = coursesRef.where('createdBy', '==', createdBy);
    }
    
    // Apply limit
    coursesRef = coursesRef.limit(parseInt(limit));
    
    const snapshot = await coursesRef.orderBy('createdAt', 'desc').get();
    
    const courses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      data: courses
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch courses'
    });
  }
});

// GET /api/courses/:id - Get specific course
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const courseDoc = await db.collection('courses').doc(id).get();
    
    if (!courseDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Course not found'
      });
    }

    const course = {
      id: courseDoc.id,
      ...courseDoc.data()
    };

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch course'
    });
  }
});

// PUT /api/courses/:id - Update course (teacher who created it only)
router.put('/:id', authenticateToken, requireRole('teacher'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Get existing course
    const courseDoc = await db.collection('courses').doc(id).get();
    
    if (!courseDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Course not found'
      });
    }

    const courseData = courseDoc.data();
    
    // Check if user owns the course
    if (courseData.createdBy !== req.user.uid) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update courses you created'
      });
    }

    // Validate input
    if (name && (typeof name !== 'string' || name.trim().length === 0)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Course name must be a non-empty string'
      });
    }

    // Prepare update data
    const updateData = {
      updatedAt: new Date().toISOString()
    };

    if (name) {
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description ? description.trim() : '';
    }

    // Update course
    await db.collection('courses').doc(id).update(updateData);

    const updatedCourse = {
      id,
      ...courseData,
      ...updateData
    };

    res.json({
      success: true,
      data: updatedCourse
    });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update course'
    });
  }
});

// DELETE /api/courses/:id - Delete course (teacher who created it only)
router.delete('/:id', authenticateToken, requireRole('teacher'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get existing course
    const courseDoc = await db.collection('courses').doc(id).get();
    
    if (!courseDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Course not found'
      });
    }

    const courseData = courseDoc.data();
    
    // Check if user owns the course
    if (courseData.createdBy !== req.user.uid) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete courses you created'
      });
    }

    // Delete course
    await db.collection('courses').doc(id).delete();

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete course'
    });
  }
});

module.exports = router;