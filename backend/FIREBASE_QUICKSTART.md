# Quick Start: Firebase Connection with .env

This document provides a quick overview of how to connect Firebase to your video conferencing platform using the simplified .env approach.

## ⚡ Quick Setup (5 minutes)

### 1. Get Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create/select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **"Generate new private key"**
5. Download the JSON file

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Open the downloaded JSON file and copy these values to your `.env`:

```env
# Required Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id-from-json
FIREBASE_PRIVATE_KEY_ID=private_key_id-from-json
FIREBASE_PRIVATE_KEY="private_key-from-json-with-quotes"
FIREBASE_CLIENT_EMAIL=client_email-from-json
FIREBASE_CLIENT_ID=client_id-from-json
FIREBASE_CLIENT_X509_CERT_URL=client_x509_cert_url-from-json
```

### 3. Start the Server

```bash
npm install
npm run dev
```

You should see:
```
✓ Using Firebase credentials from environment variables
✓ Firebase Admin SDK initialized successfully
```

## 🔧 Two Methods Available

| Method | Best For | Setup |
|--------|----------|-------|
| **Environment Variables** | Production, Cloud Platforms | Copy values from JSON to .env |
| **JSON File** | Local Development | Place JSON file in project, set path in .env |

## 📋 JSON to Environment Variables Mapping

Here's how to map the JSON file to environment variables:

```json
{
  "type": "service_account",           → FIREBASE_TYPE
  "project_id": "your-project",        → FIREBASE_PROJECT_ID
  "private_key_id": "key-id",          → FIREBASE_PRIVATE_KEY_ID
  "private_key": "-----BEGIN...",      → FIREBASE_PRIVATE_KEY
  "client_email": "email@...",         → FIREBASE_CLIENT_EMAIL
  "client_id": "123456789",            → FIREBASE_CLIENT_ID
  "client_x509_cert_url": "https://..." → FIREBASE_CLIENT_X509_CERT_URL
}
```

## 🚨 Common Issues & Solutions

### Issue: "Firebase credentials not found"
**Solution:** Make sure you have either:
- All required environment variables, OR
- `GOOGLE_APPLICATION_CREDENTIALS` pointing to your JSON file

### Issue: "Invalid private key"
**Solution:** Ensure the private key in .env is wrapped in quotes and includes `\n` for line breaks

### Issue: "Permission denied" in Firestore
**Solution:** Set up Firestore security rules (see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md))

## 🔒 Security Tips

1. **Never commit `.env` files** (already in `.gitignore`)
2. **Use environment variables in production**
3. **Rotate keys regularly**
4. **Set up proper Firestore security rules**

## 📖 Need More Help?

- **Detailed Setup:** [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
- **API Documentation:** [README.md](./README.md)
- **Firebase Documentation:** [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

---

**That's it!** Your Firebase connection should now work seamlessly with environment variables. 🎉