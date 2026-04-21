# Frontend-Backend Integration Quick Start

## ✅ What's Been Done

### Backend Analysis
- ✅ FastAPI setup with CORS middleware configured
- ✅ JWT-based authentication system
- ✅ API Routes identified:
  - `/api/v1/auth/register` - Student registration
  - `/api/v1/auth/verify` - OTP verification
  - `/api/v1/auth/login` - Login for students & faculty
  - `/api/v1/auth/me` - Get current user profile
  - `/api/v1/projects/` - Project management endpoints

### Frontend Setup
- ✅ Created API client (`src/lib/api.ts`)
- ✅ Created auth service (`src/lib/auth-service.ts`)
- ✅ Created auth context (`src/context/AuthContext.tsx`)
- ✅ Updated constants with correct API base URL
- ✅ Integrated AuthProvider in root layout
- ✅ Created environment templates

---

## 🚀 Quick Start (5 Steps)

### Step 1: Backend Setup
```bash
cd backend

# Create .env file
# Copy content from .env.example
# Update BACKEND_CORS_ORIGINS to: ["http://localhost:3000"]
# Keep other values as default for development

# Install dependencies
python -m pip install -r requirements.txt

# Run migrations
python -m alembic upgrade head

# Start backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Backend running at:** http://localhost:8000
**API Docs at:** http://localhost:8000/docs

---

### Step 2: Frontend Setup
```bash
cd ProEval_Frontend

# Create .env.local file
# Copy content from .env.local.example
# (API_BASE_URL should be http://localhost:8000/api/v1)

# Install dependencies
npm install

# Start frontend
npm run dev
```

**Frontend running at:** http://localhost:3000

---

### Step 3: Test Authentication Flow

#### Option A: Using API Docs (Fastest)
1. Navigate to http://localhost:8000/docs
2. Click on `/auth/register` and fill in:
   ```json
   {
     "email": "student@test.edu",
     "name": "Test Student",
     "enrollment_no": "STU001",
     "password": "Password123",
     "department": "Computer Science",
     "programme": "B.Tech",
     "batch": "2023"
   }
   ```
3. Click "Execute" to see OTP (check status code 200)
4. Click on `/auth/verify` and enter:
   ```json
   {
     "email": "student@test.edu",
     "otp": "000000"  // Default OTP in test
   }
   ```
5. You'll get an `access_token` - copy it

---

#### Option B: Using Frontend
1. Navigate to http://localhost:3000/login
2. [Login page not yet implemented - see next section]

---

### Step 4: Implement Login Page
The frontend login page is ready but needs minimal updates. Location: `src/app/(auth)/login/page.tsx`

**To implement:**
1. Copy the example from the integration guide
2. Replace the placeholder file
3. Test by entering credentials from Step 3

---

### Step 5: Test API Connection
```bash
# From terminal, test the API
curl -X GET http://localhost:8000/ \
  -H "Content-Type: application/json"

# Should return:
# {
#   "message": "Welcome to proeval API",
#   "status": "online",
#   "version": "2.2-Iterative"
# }
```

---

## 📊 Architecture Overview

```
Frontend (Next.js - Port 3000)
    ↓
    └─→ AuthContext (Global state management)
         ├─→ AuthProvider
         └─→ useAuth() hook
    
    └─→ API Client (src/lib/api.ts)
         └─→ HTTP requests with JWT
    
    └─→ Auth Service (src/lib/auth-service.ts)
         └─→ login(), register(), verifyOTP()
         └─→ getCurrentUser()

    ↓ HTTPS/JSON
    
Backend (FastAPI - Port 8000)
    ↓
    └─→ CORS Middleware (Validates origin)
    └─→ JWT Verification
    └─→ Route Handlers (/api/v1/auth, /api/v1/projects)
    └─→ Database (PostgreSQL)
```

---

## 🔐 Authentication Flow

```mermaid
1. User Registration (Frontend)
   ┌─────────────────────┐
   │ Fill Registration   │
   │ Form on Frontend    │
   └──────────┬──────────┘
              │ POST /auth/register
              ↓
   ┌─────────────────────┐
   │ Backend Validates   │
   │ & Sends OTP Email   │
   └──────────┬──────────┘
              │ Return Success Message
              ↓
   ┌─────────────────────┐
   │ "Check Your Email"  │
   │ Form for OTP entry  │
   └─────────────────────┘

2. OTP Verification (Frontend)
   ┌─────────────────────┐
   │ User Enters OTP     │
   │ from Email          │
   └──────────┬──────────┘
              │ POST /auth/verify
              ↓
   ┌─────────────────────┐
   │ Backend Validates   │
   │ OTP & Creates User  │
   └──────────┬──────────┘
              │ Return {access_token}
              ↓
   ┌─────────────────────┐
   │ Save Token to       │
   │ localStorage        │
   └──────────┬──────────┘
              │ auto-redirect
              ↓
   ┌─────────────────────┐
   │ Student Dashboard   │
   └─────────────────────┘

3. Login (Frontend)
   ┌─────────────────────┐
   │ Enter Email &       │
   │ Password            │
   └──────────┬──────────┘
              │ POST /auth/login
              ↓
   ┌─────────────────────┐
   │ Backend Verifies    │
   │ Credentials         │
   └──────────┬──────────┘
              │ Return {access_token}
              ↓
   ┌─────────────────────┐
   │ Save Token &        │
   │ Fetch User Profile  │
   └──────────┬──────────┘
              │ GET /auth/me
              ↓
   ┌─────────────────────┐
   │ Store User in       │
   │ AuthContext         │
   └──────────┬──────────┘
              │ redirect
              ↓
   ┌─────────────────────┐
   │ Dashboard/Portal    │
   └─────────────────────┘
```

---

## 📝 Implementation Checklist

### Phase 1: Basic Authentication (Current)
- [x] API Client setup
- [x] Auth Service implementation
- [x] Auth Context provider
- [ ] Login page implementation
- [ ] Register page implementation
- [ ] Protected route middleware

### Phase 2: Student Portal
- [ ] Dashboard page
- [ ] Project list view
- [ ] Project submission form
- [ ] Team management

### Phase 3: Faculty Portal
- [ ] Guide dashboard
- [ ] Evaluation interface
- [ ] Feedback submission

### Phase 4: Deployment
- [ ] Environment setup for production
- [ ] API CORS configuration
- [ ] JWT secret generation
- [ ] Database backup strategy

---

## 🛠️ Common Issues & Solutions

### Issue: CORS Error
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution:**
- Backend `.env`: Update `BACKEND_CORS_ORIGINS=["http://localhost:3000"]`
- Restart backend server
- Clear browser cache

### Issue: 401 Unauthorized
```
"Invalid token" or "Token expired"
```
**Solution:**
- Clear `localStorage.access_token`
- Log out and log in again
- Check `JWT_SECRET` in backend `.env`

### Issue: Network Error
```
Failed to fetch from http://localhost:8000/api/v1
```
**Solution:**
- Ensure backend is running: `http://localhost:8000/docs`
- Check frontend `.env.local` `NEXT_PUBLIC_API_URL` is correct
- Verify firewall isn't blocking port 8000

---

## 📚 Files Created/Modified

### New Files Created:
```
ProEval_Frontend/
├── src/lib/api.ts                 # HTTP client
├── src/lib/auth-service.ts        # Auth services
├── src/context/AuthContext.tsx    # Global auth state
├── .env.local.example             # Frontend env template

backend/
├── .env.example                   # Backend env template

Root/
└── FRONTEND_BACKEND_INTEGRATION.md  # Full integration guide
```

### Files Modified:
```
ProEval_Frontend/
├── src/app/layout.tsx             # Added AuthProvider
├── src/constants/index.ts         # Updated API_BASE_URL

backend/
└── [No changes needed - ready to connect]
```

---

## 🔗 API Reference

### Base URL
```
http://localhost:8000/api/v1
```

### Auth Endpoints

#### Register
```
POST /auth/register
Content-Type: application/json

{
  "email": "student@university.edu",
  "name": "John Doe",
  "enrollment_no": "ENG001",
  "password": "securePassword123",
  "department": "Engineering",
  "programme": "B.Tech",
  "batch": "2023"
}

Response: 200 OK
{ "message": "Verification code sent to your email" }
```

#### Verify OTP
```
POST /auth/verify
Content-Type: application/json

{
  "email": "student@university.edu",
  "otp": "123456"
}

Response: 200 OK
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

#### Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "student@university.edu",
  "password": "securePassword123"
}

Response: 200 OK
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

#### Get Current User
```
GET /auth/me
Authorization: Bearer {access_token}

Response: 200 OK
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "email": "student@university.edu",
  "role": "STUDENT",
  "department": "Engineering",
  "enrollment_no": "ENG001",
  "programme": "B.Tech",
  "batch": "2023"
}
```

---

## 🚦 Next Steps After Basic Setup

1. **Implement Protected Routes:**
   - Create `src/middleware.ts` to protect student routes
   - Redirect unauthenticated users to login

2. **Build Student Dashboard:**
   - Display enrolled projects
   - Show project status (pending/phase1/phase2/completed)
   - List team members

3. **Implement Project Submission:**
   - Create project submission form (Phase 1)
   - File upload interface
   - Team management features

4. **Add Error Handling:**
   - Error boundaries for better UX
   - Toast notifications for user feedback
   - Detailed error logging

5. **Testing:**
   - Unit tests for auth service
   - Integration tests for API calls
   - E2E tests for auth flow

---

## 📞 Support

If you encounter issues:

1. Check backend API docs: http://localhost:8000/docs
2. Verify environment variables in both `.env` files
3. Check browser console for errors (DevTools → Console)
4. Check backend logs in terminal
5. Review FRONTEND_BACKEND_INTEGRATION.md for detailed guidance

