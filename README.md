# Real-Time Collaborative Task Board

A basic full-stack collaborative task board built with:

- React + Vite
- Node.js + Express
- MongoDB + Mongoose
- Socket.IO
- JWT authentication
- bcrypt password hashing
- HTML5 drag and drop

## Features

- Register / login / logout
- JWT authentication
- Board creation, viewing, renaming and deletion
- Board membership / authorization
- Default Todo, In Progress and Done columns
- Task CRUD
- Task assignment to board members
- Drag and drop task movement
- Real-time task updates using Socket.IO rooms
- Activity log
- Basic last-write-wins concurrency strategy
- Meaningful Git commit suggestions
- API documentation

## Project structure

```text
real-time-collaborative-task-board/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── .env.example
│   └── package.json
├── server/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── server.js
│   ├── socket.js
│   ├── .env.example
│   └── package.json
└── README.md
```

## Requirements

- Node.js 18+
- MongoDB running locally or a MongoDB Atlas connection

## Setup

### 1. Backend

```bash
cd server
npm install
```

Copy `.env.example` to `.env` and configure:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/collaborative-task-board
JWT_SECRET=change_this_secret
CLIENT_URL=http://localhost:5173
```

Start:

```bash
npm run dev
```

### 2. Frontend

Open another terminal:

```bash
cd client
npm install
```

Copy `.env.example` to `.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Start:

```bash
npm run dev
```

Open the URL shown by Vite.

## API documentation

### Authentication

`POST /api/auth/register`

```json
{
  "name": "Ekaspreet",
  "email": "eka@example.com",
  "password": "password123"
}
```

`POST /api/auth/login`

```json
{
  "email": "eka@example.com",
  "password": "password123"
}
```

### Boards

All board endpoints require:

```text
Authorization: Bearer <JWT>
```

- `POST /api/boards`
- `GET /api/boards`
- `GET /api/boards/:id`
- `PATCH /api/boards/:id`
- `DELETE /api/boards/:id`

### Tasks

- `POST /api/boards/:id/tasks`
- `GET /api/boards/:id/tasks`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`

### Activity

- `GET /api/boards/:id/activity`

## Real-time implementation

When a user opens a board, the client connects to Socket.IO and joins a room named after the board ID.

Example:

```text
socket.join(boardId)
```

After a database-changing task operation succeeds, the server emits an event to that board room:

```text
task:created
task:updated
task:deleted
```

Other users connected to the same board receive the event and update their local React state without refreshing.

## Concurrency handling

This basic implementation uses a last-write-wins strategy.

When two users edit the same task at approximately the same time, the update that reaches the server last becomes the persisted version. `updatedAt` is automatically changed by MongoDB/Mongoose on successful updates.

This is intentionally simple because conflict resolution is a documented requirement, not a requirement for a sophisticated collaborative editing engine.

A future implementation could add optimistic concurrency using a `version` field:

```text
client version 4
       ↓
server checks database version
       ↓
if version matches → update to version 5
if version differs → 409 Conflict
```

## Error handling

The backend handles:

- Invalid authentication
- Missing/invalid JWT
- Unauthorized board access
- Invalid MongoDB IDs
- Missing fields
- Database errors
- Not-found resources

Socket disconnection is handled on the client with a visible connection status.

## Known limitations

- Last-write-wins concurrency
- No invitation system
- No roles
- No task reordering within the same column
- No offline synchronization queue
- No automated tests
- No Docker setup
- Board members are added through the board creation/member email field in this basic implementation

## Suggested Git history

Use meaningful commits while building:

```text
feat: initialize react and express applications
feat: add user authentication
feat: add board CRUD and authorization
feat: add task CRUD
feat: add drag and drop
feat: add socket.io board rooms
feat: add realtime task updates
feat: add activity log
docs: add architecture and api documentation
fix: handle invalid task ids
```
