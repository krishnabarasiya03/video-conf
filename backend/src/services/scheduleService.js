const { getFirestore } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

class ScheduleService {
  constructor() {
    this.db = getFirestore();
  }

  // Get student's scheduled classes
  async getStudentSchedule(studentId, filters = {}) {
    try {
      const { upcoming, from, to } = filters;
      
      // First, get all enrollments for the student
      const enrollmentsRef = this.db.collection('enrollments');
      const enrollmentsSnapshot = await enrollmentsRef
        .where('studentId', '==', studentId)
        .get();

      if (enrollmentsSnapshot.empty) {
        return [];
      }

      // Extract course IDs
      const courseIds = enrollmentsSnapshot.docs.map(doc => doc.data().courseId);

      // Get schedules for enrolled courses
      const schedulesRef = this.db.collection('schedules');
      let schedulesQuery = schedulesRef.where('courseId', 'in', courseIds);

      // Apply date filters
      if (upcoming) {
        const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        schedulesQuery = schedulesQuery.where('date', '>=', now);
      }

      if (from) {
        schedulesQuery = schedulesQuery.where('date', '>=', from);
      }

      if (to) {
        schedulesQuery = schedulesQuery.where('date', '<=', to);
      }

      const schedulesSnapshot = await schedulesQuery
        .orderBy('date')
        .orderBy('time')
        .get();

      const schedules = schedulesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return schedules;
    } catch (error) {
      console.error('Error getting student schedule:', error);
      throw new Error('Failed to retrieve student schedule');
    }
  }

  // Create a new schedule
  async createSchedule(scheduleData) {
    try {
      const { courseId, teacherId, date, time, durationMinutes } = scheduleData;

      // Verify the course exists and teacher owns it
      const courseDoc = await this.db.collection('courses').doc(courseId).get();
      if (!courseDoc.exists) {
        throw new Error('Course not found');
      }

      const courseData = courseDoc.data();
      if (courseData.createdBy !== teacherId) {
        throw new Error('Unauthorized: You can only schedule classes for your own courses');
      }

      // Generate room ID
      const roomId = uuidv4();

      // Create schedule document
      const schedule = {
        courseId,
        teacherId,
        date,
        time,
        durationMinutes,
        courseName: courseData.name,
        roomId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await this.db.collection('schedules').add(schedule);

      return {
        id: docRef.id,
        ...schedule
      };
    } catch (error) {
      console.error('Error creating schedule:', error);
      throw error;
    }
  }

  // Get schedule by room ID
  async getScheduleByRoomId(roomId) {
    try {
      const schedulesRef = this.db.collection('schedules');
      const snapshot = await schedulesRef.where('roomId', '==', roomId).get();

      if (snapshot.empty) {
        throw new Error('Schedule not found');
      }

      const scheduleDoc = snapshot.docs[0];
      return {
        id: scheduleDoc.id,
        ...scheduleDoc.data()
      };
    } catch (error) {
      console.error('Error getting schedule by room ID:', error);
      throw error;
    }
  }

  // Check if user can access room
  async canUserAccessRoom(userId, roomId, userRole) {
    try {
      const schedule = await this.getScheduleByRoomId(roomId);

      // Teacher can access if they created the course
      if (userRole === 'teacher' && schedule.teacherId === userId) {
        return true;
      }

      // Student can access if they're enrolled in the course
      if (userRole === 'student') {
        const enrollmentsRef = this.db.collection('enrollments');
        const enrollmentSnapshot = await enrollmentsRef
          .where('studentId', '==', userId)
          .where('courseId', '==', schedule.courseId)
          .get();

        return !enrollmentSnapshot.empty;
      }

      return false;
    } catch (error) {
      console.error('Error checking room access:', error);
      return false;
    }
  }

  // Get enrolled students for a course
  async getEnrolledStudents(courseId) {
    try {
      const enrollmentsRef = this.db.collection('enrollments');
      const enrollmentsSnapshot = await enrollmentsRef
        .where('courseId', '==', courseId)
        .get();

      const studentIds = enrollmentsSnapshot.docs.map(doc => doc.data().studentId);

      if (studentIds.length === 0) {
        return [];
      }

      // Get student details
      const usersRef = this.db.collection('users');
      const studentsSnapshot = await usersRef
        .where('__name__', 'in', studentIds)
        .where('role', '==', 'student')
        .get();

      return studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting enrolled students:', error);
      throw error;
    }
  }

  // Get all schedules for a teacher
  async getTeacherSchedules(teacherId) {
    try {
      const schedulesRef = this.db.collection('schedules');
      const snapshot = await schedulesRef
        .where('teacherId', '==', teacherId)
        .orderBy('date')
        .orderBy('time')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting teacher schedules:', error);
      throw error;
    }
  }
}

module.exports = ScheduleService;