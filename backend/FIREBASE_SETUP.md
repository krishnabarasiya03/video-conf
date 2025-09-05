# Firebase Setup Guide

This guide explains how to set up Firebase for the Video Conferencing Platform and configure it using environment variables.

## Prerequisites

- A Google account
- Access to [Firebase Console](https://console.firebase.google.com/)

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter your project name (e.g., "video-conf-app")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Required Services

### Enable Firestore Database

1. In your Firebase project dashboard, click "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (you can configure security rules later)
4. Select your preferred location
5. Click "Done"

### Enable Authentication

1. Click "Authentication" in the left sidebar
2. Go to the "Sign-in method" tab
3. Enable "Email/Password" provider
4. Click "Save"

## Step 3: Generate Service Account Key

1. Click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Go to the "Service accounts" tab
4. Click "Generate new private key"
5. Click "Generate key" to download the JSON file
6. Keep this file secure - it contains sensitive credentials

## Step 4: Configure Environment Variables

You have two options for configuring Firebase credentials:

### Option 1: Environment Variables (Recommended)

This method is recommended for production deployments and cloud platforms like Heroku, Vercel, etc.

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open the downloaded service account JSON file and extract the following values:

3. Update your `.env` file with these values:
   ```env
   # Firebase Configuration
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY_ID=value-from-private_key_id-field
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nvalue-from-private_key-field\n-----END PRIVATE KEY-----"
   FIREBASE_CLIENT_EMAIL=value-from-client_email-field
   FIREBASE_CLIENT_ID=value-from-client_id-field
   FIREBASE_CLIENT_X509_CERT_URL=value-from-client_x509_cert_url-field
   ```

#### Important Notes for Option 1:
- The `FIREBASE_PRIVATE_KEY` should include the full content with `\n` for line breaks
- Make sure to wrap the private key in quotes
- The `client_x509_cert_url` is usually in format: `https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com`

### Option 2: JSON File (Simple for Local Development)

This method is simpler for local development but not recommended for production.

1. Place the downloaded JSON file in your backend directory and rename it to `serviceAccountKey.json`

2. Update your `.env` file:
   ```env
   # Firebase Configuration
   FIREBASE_PROJECT_ID=your-project-id
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
   ```

3. **Important**: Add `serviceAccountKey.json` to your `.gitignore` to prevent committing credentials:
   ```gitignore
   serviceAccountKey.json
   ```

## Step 5: Verify Configuration

1. Start your backend server:
   ```bash
   npm run dev
   ```

2. You should see these messages in the console:
   ```
   Initializing Firebase...
   Using Firebase credentials from environment variables  # (for Option 1)
   # OR
   Using Firebase credentials from JSON file              # (for Option 2)
   Firebase Admin SDK initialized successfully
   ```

3. Test the health endpoint:
   ```bash
   curl http://localhost:3000/health
   ```

## Step 6: Set Up Firestore Security Rules (Recommended)

1. In Firebase Console, go to "Firestore Database"
2. Click on the "Rules" tab
3. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Courses can be read by authenticated users, written by teachers
    match /courses/{courseId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }
    
    // Enrollments can be read by the student or course teacher
    match /enrollments/{enrollmentId} {
      allow read: if request.auth != null && (
        resource.data.studentId == request.auth.uid ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher'
      );
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.studentId &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'student';
    }
    
    // Schedules can be read by enrolled students and teachers
    match /schedules/{scheduleId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
    }
  }
}
```

4. Click "Publish"

## Troubleshooting

### Common Issues

1. **"Failed to initialize Firebase Admin SDK"**
   - Check that all required environment variables are set
   - Verify the private key format (should include `\n` for line breaks)
   - Ensure the project ID is correct

2. **"Invalid or expired token"**
   - Verify that Authentication is enabled in Firebase Console
   - Check that the service account has the necessary permissions

3. **"Permission denied" errors in Firestore**
   - Set up security rules as described in Step 6
   - Ensure users are properly authenticated before accessing Firestore

### Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `FIREBASE_PROJECT_ID` | Yes | Your Firebase project ID |
| `FIREBASE_PRIVATE_KEY` | Yes (Option 1) | Service account private key |
| `FIREBASE_CLIENT_EMAIL` | Yes (Option 1) | Service account email |
| `FIREBASE_PRIVATE_KEY_ID` | Yes (Option 1) | Private key ID from service account |
| `FIREBASE_CLIENT_ID` | Yes (Option 1) | Client ID from service account |
| `FIREBASE_CLIENT_X509_CERT_URL` | Yes (Option 1) | X509 cert URL from service account |
| `GOOGLE_APPLICATION_CREDENTIALS` | Yes (Option 2) | Path to service account JSON file |

## Security Best Practices

1. **Never commit credentials to version control**
2. **Use environment variables in production**
3. **Implement proper Firestore security rules**
4. **Regularly rotate service account keys**
5. **Use least privilege principle for service accounts**
6. **Monitor Firebase usage and access logs**

## Next Steps

Once Firebase is configured:

1. Start the backend server: `npm run dev`
2. Test API endpoints with proper authentication
3. Set up your frontend to use Firebase Authentication
4. Configure CORS for your frontend domains

For more information, see the main [README.md](./README.md) file.