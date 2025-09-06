import React, { useState, useEffect, useCallback } from 'react';
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
  TextField,
  List,
  ListItem,
  ListItemText,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Schedule as ScheduleIcon,
  ExitToApp as LogoutIcon,
  VideoCall as VideoCallIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { Course, Schedule } from '../types';
import { useNavigate } from 'react-router-dom';

export default function TeacherDashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [error, setError] = useState('');
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [courseForm, setCourseForm] = useState({
    name: '',
    description: '',
  });

  const [scheduleForm, setScheduleForm] = useState({
    date: '',
    time: '',
    durationMinutes: 60,
  });

  const fetchData = useCallback(async () => {
    try {
      const [coursesResponse, schedulesResponse] = await Promise.all([
        apiService.getCourses(),
        apiService.getSchedules(),
      ]);
      
      // Filter courses created by current teacher
      const teacherCourses = coursesResponse.data.data.filter(
        course => course.createdBy === user?.uid
      );
      setCourses(teacherCourses);
      setSchedules(schedulesResponse.data.data);
    } catch (error: any) {
      setError('Failed to load data');
      console.error('Data fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateCourse = async () => {
    setSubmitLoading(true);
    try {
      await apiService.createCourse(courseForm);
      setShowCourseDialog(false);
      setCourseForm({ name: '', description: '' });
      fetchData();
    } catch (error: any) {
      setError('Failed to create course');
      console.error('Course creation error:', error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!selectedCourse) return;
    
    setSubmitLoading(true);
    try {
      await apiService.createSchedule({
        courseId: selectedCourse.id,
        date: scheduleForm.date,
        time: scheduleForm.time,
        durationMinutes: scheduleForm.durationMinutes,
      });
      setShowScheduleDialog(false);
      setScheduleForm({ date: '', time: '', durationMinutes: 60 });
      setSelectedCourse(null);
      fetchData();
    } catch (error: any) {
      setError('Failed to create schedule');
      console.error('Schedule creation error:', error);
    } finally {
      setSubmitLoading(false);
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
            Teacher Dashboard
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

        <Grid container spacing={3}>
          {/* My Courses */}
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
                    Create Course
                  </Button>
                </Box>
                <List>
                  {courses.map((course) => (
                    <ListItem key={course.id}>
                      <ListItemText
                        primary={course.name}
                        secondary={course.description}
                      />
                      <Button
                        startIcon={<ScheduleIcon />}
                        variant="contained"
                        size="small"
                        onClick={() => {
                          setSelectedCourse(course);
                          setShowScheduleDialog(true);
                        }}
                      >
                        Add Class
                      </Button>
                    </ListItem>
                  ))}
                  {!courses.length && (
                    <ListItem>
                      <ListItemText primary="No courses created yet" />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Scheduled Classes */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Scheduled Classes
                </Typography>
                <List>
                  {schedules
                    .filter(schedule => schedule.teacherId === user?.uid)
                    .map((schedule) => (
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
                          Start Class
                        </Button>
                      </ListItem>
                    ))}
                  {!schedules.filter(s => s.teacherId === user?.uid).length && (
                    <ListItem>
                      <ListItemText primary="No scheduled classes" />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Create Course Dialog */}
      <Dialog open={showCourseDialog} onClose={() => setShowCourseDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Course</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Course Name"
            fullWidth
            variant="outlined"
            value={courseForm.name}
            onChange={(e) => setCourseForm(prev => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={courseForm.description}
            onChange={(e) => setCourseForm(prev => ({ ...prev, description: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCourseDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateCourse} 
            variant="contained"
            disabled={!courseForm.name || submitLoading}
          >
            {submitLoading ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Schedule Dialog */}
      <Dialog open={showScheduleDialog} onClose={() => setShowScheduleDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Schedule Class for {selectedCourse?.name}</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Date"
            type="date"
            fullWidth
            variant="outlined"
            value={scheduleForm.date}
            onChange={(e) => setScheduleForm(prev => ({ ...prev, date: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Time"
            type="time"
            fullWidth
            variant="outlined"
            value={scheduleForm.time}
            onChange={(e) => setScheduleForm(prev => ({ ...prev, time: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Duration (minutes)"
            type="number"
            fullWidth
            variant="outlined"
            value={scheduleForm.durationMinutes}
            onChange={(e) => setScheduleForm(prev => ({ 
              ...prev, 
              durationMinutes: parseInt(e.target.value) || 60 
            }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowScheduleDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateSchedule} 
            variant="contained"
            disabled={!scheduleForm.date || !scheduleForm.time || submitLoading}
          >
            {submitLoading ? <CircularProgress size={20} /> : 'Schedule'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}