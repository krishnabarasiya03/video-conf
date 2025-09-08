# Student Data Fetch API - Postman Testing Guide

This guide explains how to use Postman to test the new Student Data Fetch API endpoints that were added to the video conferencing platform backend.

## Overview

The following new API endpoints have been added for fetching student data from Firebase:

1. **GET `/api/students`** - Fetch all students data (teacher access required)
2. **GET `/api/students/:id`** - Fetch specific student data by ID (teacher access required)

## Prerequisites

Before testing these APIs in Postman, ensure:

1. **Backend Server is Running**: The Node.js backend server should be running on `http://localhost:3000` (or your configured port)
2. **Firebase Setup**: Firebase credentials must be properly configured in the `.env` file
3. **Authentication Token**: You need a valid Firebase ID token for a user with 'teacher' role

## Setup Instructions

### 1. Environment Setup

1. **Copy Environment Variables**:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Configure Firebase Credentials** in `.env`:
   ```env
   # Firebase Configuration
   FIREBASE_PROJECT_ID=your-firebase-project-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key-content\n-----END PRIVATE KEY-----"
   FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
   # ... other Firebase variables
   ```

3. **Start the Backend Server**:
   ```bash
   npm install
   npm start
   ```

### 2. Get Authentication Token

To test the teacher-only endpoints, you need a Firebase ID token for a user with 'teacher' role:

1. **Create a Teacher User** in Firebase Authentication
2. **Add User Profile** to Firestore in `users` collection:
   ```json
   {
     "name": "John Teacher",
     "email": "teacher@example.com",
     "role": "teacher",
     "createdAt": "2024-01-01T00:00:00.000Z",
     "updatedAt": "2024-01-01T00:00:00.000Z"
   }
   ```
3. **Get ID Token** using Firebase SDK or Firebase Auth REST API

## Postman Configuration

### Create a New Collection

1. Open Postman and create a new collection named "Video Conf - Student API"
2. Add the following environment variables:
   - `base_url`: `http://localhost:3000`
   - `auth_token`: `your-firebase-id-token`

### Authentication Setup

For all requests, add the following header:
- **Header**: `Authorization`
- **Value**: `Bearer {{auth_token}}`

## API Endpoints Testing

### 1. GET All Students

**Endpoint**: `GET {{base_url}}/api/students`

**Description**: Fetches all students data with pagination support

**Headers**:
```
Authorization: Bearer {{auth_token}}
Content-Type: application/json
```

**Query Parameters** (optional):
- `limit` (number, 1-100): Maximum number of students to return (default: 50)
- `offset` (number, ≥0): Number of students to skip for pagination (default: 0)

**Example Requests**:

1. **Basic Request**:
   ```
   GET {{base_url}}/api/students
   ```

2. **With Pagination**:
   ```
   GET {{base_url}}/api/students?limit=10&offset=0
   ```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "students": [
      {
        "id": "student-uid-1",
        "name": "John Student",
        "email": "john@example.com",
        "role": "student",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "stats": {
          "enrolledCourses": 3,
          "upcomingClasses": 5
        }
      }
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "count": 1
    }
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid or missing auth token
- `403 Forbidden`: User is not a teacher
- `400 Bad Request`: Invalid pagination parameters
- `500 Internal Server Error`: Server error

### 2. GET Student by ID

**Endpoint**: `GET {{base_url}}/api/students/:id`

**Description**: Fetches detailed data for a specific student

**Headers**:
```
Authorization: Bearer {{auth_token}}
Content-Type: application/json
```

**Path Parameters**:
- `id` (string, required): The student's unique ID (Firebase UID)

**Example Request**:
```
GET {{base_url}}/api/students/student-uid-123
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "student-uid-123",
    "name": "Jane Student",
    "email": "jane@example.com",
    "role": "student",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "stats": {
      "enrolledCourses": 2,
      "upcomingClasses": 3,
      "todayClasses": 1
    },
    "enrolledCourses": [
      {
        "id": "course-1",
        "name": "Web Development",
        "description": "Learn HTML, CSS, JavaScript"
      }
    ],
    "upcomingClasses": [
      {
        "id": "schedule-1",
        "courseId": "course-1",
        "date": "2024-01-15",
        "time": "10:00",
        "durationMinutes": 60
      }
    ],
    "todayClasses": []
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid or missing auth token
- `403 Forbidden`: User is not a teacher
- `404 Not Found`: Student not found or user is not a student
- `400 Bad Request`: Invalid student ID
- `500 Internal Server Error`: Server error

## Testing Scenarios

### Valid Test Cases

1. **Teacher accessing all students**:
   - Use valid teacher token
   - Verify response contains student list
   - Test pagination with different limit/offset values

2. **Teacher accessing specific student**:
   - Use valid teacher token and existing student ID
   - Verify detailed student information is returned

3. **Pagination testing**:
   - Test with various limit values (1, 10, 50, 100)
   - Test offset for pagination
   - Verify count matches returned data

### Error Test Cases

1. **Unauthorized access**:
   - Request without Authorization header
   - Request with invalid token
   - Request with expired token

2. **Forbidden access**:
   - Use student token instead of teacher token
   - Use token with different role

3. **Invalid parameters**:
   - Invalid limit values (0, 101, negative, non-numeric)
   - Invalid offset values (negative, non-numeric)
   - Invalid student ID in path parameter

4. **Not found scenarios**:
   - Request student by non-existent ID
   - Request user with non-student role by ID

## Postman Collection Import

You can create a Postman collection JSON file with these pre-configured requests:

```json
{
  "info": {
    "name": "Video Conf - Student API",
    "description": "API endpoints for fetching student data"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000"
    },
    {
      "key": "auth_token",
      "value": "your-firebase-id-token"
    }
  ],
  "item": [
    {
      "name": "Get All Students",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{auth_token}}"
          }
        ],
        "url": {
          "raw": "{{base_url}}/api/students?limit=10&offset=0",
          "host": ["{{base_url}}"],
          "path": ["api", "students"],
          "query": [
            {"key": "limit", "value": "10"},
            {"key": "offset", "value": "0"}
          ]
        }
      }
    },
    {
      "name": "Get Student by ID",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{auth_token}}"
          }
        ],
        "url": {
          "raw": "{{base_url}}/api/students/:student_id",
          "host": ["{{base_url}}"],
          "path": ["api", "students", ":student_id"],
          "variable": [
            {
              "key": "student_id",
              "value": "replace-with-actual-student-id"
            }
          ]
        }
      }
    }
  ]
}
```

## Troubleshooting

### Common Issues

1. **Server not starting**:
   - Check Firebase credentials in `.env`
   - Ensure all required environment variables are set
   - Verify Node.js version (requires 20+)

2. **401 Unauthorized**:
   - Verify Firebase ID token is valid and not expired
   - Check Authorization header format: `Bearer <token>`

3. **403 Forbidden**:
   - Ensure the authenticated user has 'teacher' role
   - Verify user profile exists in Firestore with correct role

4. **Empty student lists**:
   - Check if students exist in Firestore 'users' collection
   - Verify students have role: 'student'

5. **Firebase connection issues**:
   - Verify Firebase project ID and credentials
   - Check Firestore security rules allow read access

### Debug Steps

1. **Check server logs** for detailed error messages
2. **Verify Firebase setup** using the health endpoint: `GET /health`
3. **Test basic auth** using the profile endpoint: `GET /api/me`
4. **Validate user data** in Firebase Console

## Security Notes

- Always use HTTPS in production
- Regularly rotate Firebase service account keys
- Implement proper Firestore security rules
- Use rate limiting for production APIs
- Validate and sanitize all input parameters

## Additional Resources

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Express.js Documentation](https://expressjs.com/)
- [Postman Learning Center](https://learning.postman.com/)