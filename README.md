# Team Task Manager

A production-ready full-stack web app for teams to manage projects and tasks with role-based access control.

- **Frontend:** React (Vite) + Tailwind CSS + React Router + Axios
- **Backend:** Node.js + Express + Mongoose (MongoDB)
- **Auth:** JWT + bcrypt password hashing
- **Deployment:** Railway (frontend + backend) + MongoDB Atlas

---

## Features

- Sign up / log in with JWT (token persisted in `localStorage`, auto-refresh on reload)
- Role-based access control (`admin`, `member`)
- Projects: create, view, update, delete, manage members
- Tasks: create inside a project, assign to a member, update status (`Todo` / `In Progress` / `Done`)
- Dashboard: total / completed / pending / overdue task counts, "assigned to me", recent tasks
- REST API with proper status codes, validation, and ObjectId checks
- Responsive Tailwind UI, protected routes, loading & error states

### Roles

| Capability                      | Admin | Member |
| ------------------------------- | :---: | :----: |
| Create projects                 |   ✓   |        |
| Add / remove project members    |   ✓   |        |
| Create tasks                    |   ✓   |        |
| Assign tasks                    |   ✓   |        |
| Update any task                 |   ✓   |        |
| View assigned projects / tasks  |   ✓   |   ✓    |
| Update **own** task status      |   ✓   |   ✓    |

> "Admin" privileges on projects, members, and tasks apply to the user who **created** the project (the project admin). The global `admin` role is a prerequisite for creating projects in the first place.

---

## Folder structure

```
.
├── backend/
│   ├── config/db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── projectController.js
│   │   ├── taskController.js
│   │   └── dashboardController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── errorMiddleware.js
│   │   └── validateObjectId.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Project.js
│   │   └── Task.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── projectRoutes.js
│   │   ├── taskRoutes.js
│   │   └── dashboardRoutes.js
│   ├── utils/generateToken.js
│   ├── server.js
│   ├── package.json
│   ├── railway.json
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/axios.js
    │   ├── components/
    │   │   ├── Loader.jsx
    │   │   ├── Navbar.jsx
    │   │   ├── ProjectCard.jsx
    │   │   ├── ProtectedRoute.jsx
    │   │   └── TaskCard.jsx
    │   ├── context/AuthContext.jsx
    │   ├── pages/
    │   │   ├── Dashboard.jsx
    │   │   ├── Login.jsx
    │   │   ├── ProjectDetail.jsx
    │   │   ├── Projects.jsx
    │   │   └── Signup.jsx
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── vite.config.js
    ├── railway.json
    └── .env.example
```

---

## API reference

All protected routes require: `Authorization: Bearer <token>`.

### Auth

| Method | Path                | Description                |
| ------ | ------------------- | -------------------------- |
| POST   | `/api/auth/signup`  | `{ name, email, password, role? }` |
| POST   | `/api/auth/login`   | `{ email, password }`      |
| GET    | `/api/auth/me`      | Current user (protected)   |

### Projects (protected)

| Method | Path                            | Notes                                    |
| ------ | ------------------------------- | ---------------------------------------- |
| GET    | `/api/projects`                 | Projects you are admin of OR a member of |
| POST   | `/api/projects`                 | Admin role required                      |
| GET    | `/api/projects/:id`             | Must be member or admin of the project   |
| PUT    | `/api/projects/:id`             | Project admin only                       |
| DELETE | `/api/projects/:id`             | Project admin only (cascades tasks)      |
| PUT    | `/api/projects/:id/members`     | `{ add?: [userId], remove?: [userId] }`  |
| GET    | `/api/projects/users/list?search=` | Search users (admin role required)    |

### Tasks (protected)

| Method | Path              | Notes                                                     |
| ------ | ----------------- | --------------------------------------------------------- |
| GET    | `/api/tasks`      | Optional `?project=<id>`, `?assignedToMe=true`, `?status=`|
| POST   | `/api/tasks`      | Project admin only — `{ title, project, ... }`            |
| GET    | `/api/tasks/:id`  | Must be member of the task's project                      |
| PUT    | `/api/tasks/:id`  | Project admin: anything. Assignee: status only.           |
| DELETE | `/api/tasks/:id`  | Project admin only                                        |

### Dashboard (protected)

| Method | Path             | Description                                          |
| ------ | ---------------- | ---------------------------------------------------- |
| GET    | `/api/dashboard` | Counts + tasks assigned to me + recent tasks         |

### Health

`GET /api/health` → `{ status: "ok", time: <iso> }`

---

## Local development

### Prerequisites

- Node.js 18+
- A MongoDB Atlas cluster (or local MongoDB)

### 1. Backend

```bash
cd backend
cp .env.example .env       # then fill in MONGO_URI and JWT_SECRET
npm install
npm run dev                # http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env       # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev                # http://localhost:5173
```

Open the app at `http://localhost:5173`. Sign up (pick `admin` to be able to create projects), then create a project and start adding tasks.

---

## Environment variables

### Backend (`backend/.env`)

| Key             | Example                                                                      |
| --------------- | ---------------------------------------------------------------------------- |
| `PORT`          | `5000`                                                                       |
| `NODE_ENV`      | `development` or `production`                                                |
| `MONGO_URI`     | `mongodb+srv://user:pass@cluster0.mongodb.net/team_task_manager`             |
| `JWT_SECRET`    | A long random string                                                         |
| `JWT_EXPIRES_IN`| `7d`                                                                         |
| `CORS_ORIGIN`   | Frontend URL (comma-separated for multiple), e.g. `https://app.example.com`  |

### Frontend (`frontend/.env`)

| Key             | Example                                       |
| --------------- | --------------------------------------------- |
| `VITE_API_URL`  | `https://your-backend.up.railway.app/api`     |

> `VITE_*` variables are baked into the bundle at **build time** — set them before `npm run build`.

---

## Deployment — Railway

### Step 1 — MongoDB Atlas

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a database user and a strong password.
3. Network Access → allow `0.0.0.0/0` (or restrict to Railway's egress IPs).
4. Copy the connection string (replace `<password>` with the real password).

### Step 2 — Deploy the backend

1. Push this repo to GitHub.
2. In Railway, **New Project → Deploy from GitHub repo**.
3. Set the **Root Directory** to `backend/`.
4. Add environment variables in the Variables tab:
   - `MONGO_URI` — your Atlas connection string
   - `JWT_SECRET` — long random string
   - `JWT_EXPIRES_IN` — `7d`
   - `NODE_ENV` — `production`
   - `CORS_ORIGIN` — placeholder for now (e.g. `*`); update once frontend has a URL
5. Railway will detect Node and run `npm start`.
6. Once deployed, note the public URL (e.g. `https://ttm-backend.up.railway.app`).
7. Verify with `https://<backend-url>/api/health` → should return `{"status":"ok"}`.

### Step 3 — Deploy the frontend

1. In the same Railway project, **+ New → GitHub repo** (same repo).
2. Set the **Root Directory** to `frontend/`.
3. Add environment variable:
   - `VITE_API_URL` = `https://<backend-url>/api`
4. Build command: `npm install && npm run build` (already set in `railway.json`).
5. Start command: `npm run preview` (Vite preview server, listens on `$PORT`).
6. Generate a public domain in Settings → Networking.
7. Go back to the **backend** service and update `CORS_ORIGIN` to the frontend's public URL, then redeploy.

### Step 4 — Smoke test

- Open the frontend URL, sign up as an `admin`.
- Create a project, add tasks, sign up a second `member` user, add them, assign a task, switch accounts and verify the member can change only their own task's status.

---

## Security notes

- Passwords are hashed with `bcryptjs` (10 rounds) and never returned in API responses (`select: false` on the schema).
- JWT is verified on every protected request; expired/invalid tokens trigger an automatic logout on the frontend (axios 401 interceptor).
- Project-level access is enforced server-side on every read/write — clients cannot bypass by guessing IDs.
- ObjectId params are validated before they reach the controller.
- CORS origins are configurable via env; do **not** ship `CORS_ORIGIN=*` to production.

---

## Scripts cheat sheet

Backend:

- `npm run dev` — start with nodemon
- `npm start` — start in production mode

Frontend:

- `npm run dev` — Vite dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the built `dist/` (used by Railway)
