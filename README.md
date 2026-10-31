# Altru Server — Community-Driven Social Development Events Platform API

The backend server for **Altru**, a community-driven platform empowering individuals and local organizations across Bangladesh to create, discover, join, and track impactful social service events (such as winter clothes drives, blanket distribution, tree plantations, cleanups, medical camps, and food relief).

- **Live Server URL:** https://altru-server.onrender.com (or local `http://localhost:5000`)
- **Client App URL:** https://altru-community.vercel.app (or local `http://localhost:3000`)

---

## 🌟 Key Server Features

- **Robust RESTful API Architecture:** Scalable and cleanly organized controllers and routes for authentication, event management, and volunteer RSVP tracking.
- **Secure JWT Authentication & Authorization:** Stateless token-based auth protecting private routes such as event creation, updating, deletion, profile editing, and joining events.
- **MongoDB Native Driver Integration:** High-performance database operations utilizing MongoDB Atlas with indexing, querying, and sorting by event dates.
- **Strict Owner Verification:** Granular authorization ensuring users can only edit or delete their own created social events.
- **Duplicate Join Prevention:** Enforces unique attendee registration per event with real-time attendee counters and volunteer attendee logs.
- **Date & Payload Validation:** Strict server-side validation preventing past-date event creation, enforcing required fields, and verifying secure password complexity.
- **Automated Database Seeder:** Pre-configured with realistic social service events across Dhaka and Bangladesh for immediate testing and demonstration.

---

## 🛠️ Tech Stack

- **Runtime Environment:** Node.js (v18+)
- **Framework:** Express.js 5
- **Database:** MongoDB Atlas (Native MongoDB Driver v7)
- **Security & Cryptography:** `jsonwebtoken` (JWT), `bcryptjs`
- **CORS & Environment:** `cors`, `dotenv`
- **Development Tool:** `nodemon`

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js installed (v18 or higher)
- MongoDB Atlas connection string (or local MongoDB)

### 2. Installation
```bash
cd server
npm install
```

### 3. Environment Variables
Create a `.env` file in the `server` root directory:
```env
PORT=5000
DB_USER=your_db_username
DB_PASS=your_db_password
DB_NAME=altru_db
MONGODB_URI=your_mongodb_connection_uri
JWT_SECRET=your_super_secret_jwt_key
CLIENT_URL=http://localhost:3000
```

### 4. Seed Initial Data
```bash
npm run seed
```

### 5. Start Development Server
```bash
npm run dev
```
The server will start listening at `http://localhost:5000`.

---

## 📡 API Endpoints Overview

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user with password validation | Public |
| `POST` | `/api/auth/login` | Login with email and password | Public |
| `POST` | `/api/auth/google` | Google authentication | Public |
| `GET` | `/api/auth/me` | Get current logged-in user details | Private |
| `PUT` | `/api/auth/profile` | Update profile name and photoURL | Private |

### Events (`/api/events`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/events` | Get events (supports `?upcoming=true`, `?limit=6`, `?search=`, `?type=`) | Public |
| `GET` | `/api/events/:id` | Get single event details with attendee list | Public |
| `POST` | `/api/events` | Create new community event (future date only) | Private |
| `GET` | `/api/events/user/my-events` | Get all events created by logged-in user | Private |
| `PUT` | `/api/events/:id` | Update event (creator only) | Private |
| `DELETE` | `/api/events/:id` | Delete event (creator only) | Private |

### Joined Events (`/api/joined-events`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/joined-events` | Join an upcoming event | Private |
| `GET` | `/api/joined-events/my-joined` | Get user's joined events sorted by date | Private |
| `GET` | `/api/joined-events/check/:eventId` | Check if user joined event | Private |
| `DELETE` | `/api/joined-events/:id` | Cancel RSVP / leave event | Private |

---

## 📜 License
This project is open-source under the MIT License.
