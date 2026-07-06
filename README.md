# 🔐 Auth API — Node.js + Express + MongoDB

Production-ready authentication & authorization API with:
- ✅ JWT Access + Refresh Token rotation
- ✅ Email verification
- ✅ Forgot / Reset password
- ✅ Role-based authorization (user / admin)
- ✅ Account lockout after failed attempts
- ✅ Rate limiting
- ✅ Input validation with detailed error messages
- ✅ Security headers (Helmet)
- ✅ HttpOnly cookie for refresh tokens

---

## 📁 Project Structure

```
auth-api/
├── config/
│   └── db.js                  # MongoDB connection
├── controllers/
│   ├── authController.js      # All auth logic
│   └── adminController.js     # Admin operations
├── middleware/
│   ├── auth.js                # protect + restrictTo
│   ├── validate.js            # express-validator rules
│   └── rateLimiter.js         # Rate limiters
├── models/
│   └── User.js                # User schema + methods
├── routes/
│   ├── authRoutes.js
│   └── adminRoutes.js
├── utils/
│   ├── jwt.js                 # Token helpers
│   ├── email.js               # Nodemailer helpers
│   └── response.js            # Consistent API responses
├── app.js                     # Express app
├── server.js                  # Entry point
├── .env.example
└── package.json
```

---

## 🚀 Setup

```bash
# 1. Clone and install
npm install

# 2. Configure environment
cp .env.example .env
# Fill in your MONGO_URI, JWT secrets, and email credentials

# 3. Run
npm run dev     # development
npm start       # production
```

---

## 🌐 API Endpoints

### Auth Routes — `/api/auth`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/signup` | Public | Register new user |
| GET | `/verify-email/:token` | Public | Verify email address |
| POST | `/resend-verification` | Public | Resend verification email |
| POST | `/signin` | Public | Sign in (returns accessToken) |
| POST | `/refresh-token` | Public | Rotate tokens via cookie |
| POST | `/forgot-password` | Public | Send reset email |
| POST | `/reset-password/:token` | Public | Reset password |
| GET | `/me` | Private 🔒 | Get own profile |
| POST | `/signout` | Private 🔒 | Sign out |
| POST | `/change-password` | Private 🔒 | Change password |

### Admin Routes — `/api/admin` (Admin only 👑)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List all users (paginated) |
| PATCH | `/users/:id/role` | Update user role |
| PATCH | `/users/:id/status` | Activate / deactivate user |
| DELETE | `/users/:id` | Delete user |

---

## 📦 Request / Response Examples

### POST `/api/auth/signup`
```json
// Request
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass@123",
  "confirmPassword": "SecurePass@123"
}

// Response 201
{
  "success": true,
  "message": "Account created! Please check your email to verify your account.",
  "data": {
    "user": { "id": "...", "name": "John Doe", "email": "john@example.com", "role": "user" }
  }
}
```

### POST `/api/auth/signin`
```json
// Request
{ "email": "john@example.com", "password": "SecurePass@123" }

// Response 200
{
  "success": true,
  "message": "Signed in successfully.",
  "data": {
    "accessToken": "eyJhbGc...",
    "user": { "id": "...", "name": "John Doe", "role": "user" }
  }
}
// refreshToken is set as httpOnly cookie automatically
```

### Using Protected Routes
```
Authorization: Bearer <accessToken>
```

---

## 🔒 Security Features

| Feature | Detail |
|---------|--------|
| Password hashing | bcrypt with 12 salt rounds |
| Account lockout | 5 failed attempts → 30 min lock |
| Refresh token rotation | New refresh token on every refresh |
| Token invalidation | All tokens revoked on password change |
| Email enumeration prevention | Same response for existing/non-existing emails |
| HttpOnly cookies | Refresh token never accessible via JS |
| Payload size limit | JSON body capped at 10kb |
| Rate limiting | Auth: 10/15min · Forgot: 5/hour · API: 100/15min |

---

## 🔑 Password Requirements
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (@$!%*?&#^)