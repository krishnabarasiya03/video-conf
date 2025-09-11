const express = require('express');
const { getFirestore } = require('../config/firebase');

const router = express.Router();

// GET /api/students - Fetch all users (no authentication required)
router.get('/', async (req, res) => {
  try {
    const db = getFirestore();
    
    // Fetch all documents from users collection
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      return res.json({
        success: true,
        data: {
          students: [],
          count: 0
        }
      });
    }
    
    // Convert snapshot to array of user data
    const users = [];
    usersSnapshot.forEach(doc => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json({
      success: true,
      data: {
        students: users,
        count: users.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch users'
    });
  }
});

module.exports = router;