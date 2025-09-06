import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Box,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';
import { Add as AddIcon, VideoCall as VideoCallIcon, ExitToApp as LogoutIcon } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { Course, Schedule, StudentDashboard as StudentDashboardType } from '../types';
import { useNavigate } from 'react-router-dom';

export default function StudentDashboard() {
  const [dashboardData, setDashboardData] = useState<StudentDashboardType | null>(null);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollmentLoading, setEnrollmentLoading] = useState<string | null>(null);
  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [error, setError] = useState('');
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
    fetchAllCourses();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await apiService.getStudentDashboard();
      setDashboardData(response.data.data);
    } catch (error: any) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCourses = async () => {
    try {
      const response = await apiService.getCourses();
      setAllCourses(response.data.data);
    } catch (error: any) {
      console.error('Courses error:', error);
    }
  };

  const handleEnrollCourse = async (courseId: string) => {
    setEnrollmentLoading(courseId);
    try {
      await apiService.enrollInCourse(courseId);
      setShowCourseDialog(false);
      fetchDashboardData(); // Refresh dashboard
      fetchAllCourses(); // Refresh courses
    } catch (error: any) {
      setError('Failed to enroll in course');
      console.error('Enrollment error:', error);
    } finally {
      setEnrollmentLoading(null);
    }
  };

  const handleJoinClass = (schedule: Schedule) => {
    navigate(`/meeting/${schedule.roomId}`);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error: any) {
      console.error('Logout error:', error);
    }
  };

  const availableCourses = allCourses.filter(
    course => !dashboardData?.enrolledCourses.some(enrolled => enrolled.id === course.id)
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Student Dashboard
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            Welcome, {user?.name}
          </Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Enrolled Courses
                </Typography>
                <Typography variant="h4">
                  {dashboardData?.stats.enrolledCourses || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Today's Classes
                </Typography>
                <Typography variant="h4">
                  {dashboardData?.stats.todayClasses || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Upcoming Classes
                </Typography>
                <Typography variant="h4">
                  {dashboardData?.stats.upcomingClasses || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Enrolled Courses */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">My Courses</Typography>
                  <Button
                    startIcon={<AddIcon />}
                    variant="outlined"
                    onClick={() => setShowCourseDialog(true)}
                  >
                    Enroll in Course
                  </Button>
                </Box>
                <List>
                  {dashboardData?.enrolledCourses.map((course) => (
                    <ListItem key={course.id}>
                      <ListItemText
                        primary={course.name}
                        secondary={course.description}
                      />
                    </ListItem>
                  ))}
                  {!dashboardData?.enrolledCourses.length && (
                    <ListItem>
                      <ListItemText primary="No enrolled courses" />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Upcoming Classes */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Upcoming Classes
                </Typography>
                <List>
                  {dashboardData?.upcomingClasses.map((schedule) => (
                    <ListItem key={schedule.id}>
                      <ListItemText
                        primary={schedule.courseName}
                        secondary={`${schedule.date} at ${schedule.time} (${schedule.durationMinutes} min)`}
                      />
                      <Button
                        startIcon={<VideoCallIcon />}
                        variant="contained"
                        size="small"
                        onClick={() => handleJoinClass(schedule)}
                      >
                        Join
                      </Button>
                    </ListItem>
                  ))}
                  {!dashboardData?.upcomingClasses.length && (
                    <ListItem>
                      <ListItemText primary="No upcoming classes" />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Course Enrollment Dialog */}
      <Dialog open={showCourseDialog} onClose={() => setShowCourseDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Available Courses</DialogTitle>
        <DialogContent>
          <List>
            {availableCourses.map((course) => (
              <ListItem key={course.id}>
                <ListItemText
                  primary={course.name}
                  secondary={course.description}
                />
                <Button
                  variant="contained"
                  onClick={() => handleEnrollCourse(course.id)}
                  disabled={enrollmentLoading === course.id}
                >
                  {enrollmentLoading === course.id ? <CircularProgress size={20} /> : 'Enroll'}
                </Button>
              </ListItem>
            ))}
            {!availableCourses.length && (
              <ListItem>
                <ListItemText primary="No available courses to enroll in" />
              </ListItem>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCourseDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}