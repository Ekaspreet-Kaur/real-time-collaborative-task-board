# Real-Time Collaborative Task Board

A full-stack task management application where users can create boards, manage tasks, assign tasks to other board members, and see changes in real time.

I built this project to practice working with authentication, REST APIs, MongoDB, React state management, drag and drop, and real-time communication using Socket.IO.

## Tech Stack

**Frontend**

* React
* Vite
* Axios
* Socket.IO Client
* HTML5 Drag and Drop API
* CSS

**Backend**

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT
* bcryptjs
* Socket.IO

---

## Features

### Authentication

* User registration
* User login
* JWT-based authentication
* Password hashing with bcrypt
* Client-side logout

### Boards

* Create a board
* View boards available to the logged-in user
* Open a board
* Rename a board
* Delete a board
* Add existing users as board members while creating a board
* Board owner permissions for rename and delete

### Tasks

* Create tasks
* Edit tasks
* Delete tasks
* Add a description
* Assign tasks to board members
* Move tasks between columns using drag and drop

The board has three default task statuses:

```text
Todo
In Progress
Done
```

### Real-Time Updates

Socket.IO is used to update users who are currently viewing the same board.

The application sends events for:

```text
task:created
task:updated
task:deleted
activity:created
board:updated
board:deleted
```

A connection status is also shown in the board UI.

### Activity Log

The application records activities such as:

* Task created
* Task updated
* Task moved
* Task assigned
* Task completed
* Task deleted

The latest 30 activities are displayed on the board.

---

# How the Application Works

The application has two separate parts:

```text
React + Vite
     |
     | HTTP / REST API
     ↓
Node.js + Express
     |
     ↓
MongoDB


React + Socket.IO Client
     |
     | WebSocket connection
     ↓
Socket.IO Server
     |
     ↓
Board room
```

The REST API is responsible for authentication, database operations, and authorization.

Socket.IO is used when changes need to be reflected on other clients without refreshing the page.

---

# Project Structure

```text
real-time-collaborative-task-board/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth.jsx
│   │   │   ├── Board.jsx
│   │   │   ├── Boards.jsx
│   │   │   └── TaskCard.jsx
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── .env.example
│   └── package.json
│
├── server/
│   ├── middleware/
│   │   ├── auth.js
│   │   └── error.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Board.js
│   │   ├── Task.js
│   │   └── Activity.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── boards.js
│   │   ├── tasks.js
│   │   └── activity.js
│   ├── server.js
│   ├── socket.js
│   ├── .env.example
│   └── package.json
│
└── README.md
```

---

# Requirements

You need:

* Node.js 18+
* MongoDB running locally or a MongoDB Atlas database
* npm

---

# Setup

## 1. Clone the repository

```bash
git clone <your-repository-url>
cd real-time-collaborative-task-board
```

## 2. Start the Backend

```bash
cd server
npm install
```

Create a `.env` file from `.env.example`.

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/collaborative-task-board
JWT_SECRET=change_this_secret
CLIENT_URL=http://localhost:5173
```

Start the backend:

```bash
npm run dev
```

The server should start on:

```text
http://localhost:5000
```

There is also a simple health endpoint:

```text
GET /api/health
```

---

## 3. Start the Frontend

Open another terminal:

```bash
cd client
npm install
```

Create a `.env` file:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Start Vite:

```bash
npm run dev
```

Open the URL shown in the terminal, normally:

```text
http://localhost:5173
```

---

# Authentication

When a user registers, the password is not stored directly.

The password is hashed using `bcryptjs`:

```text
Password
   ↓
bcrypt hash
   ↓
MongoDB
```

After successful registration or login, the server creates a JWT.

The frontend stores the token in `localStorage` and Axios automatically adds it to protected API requests:

```text
Authorization: Bearer <JWT>
```

The backend verifies the token through authentication middleware before allowing access to protected routes.

---

# Authorization

Authentication and authorization are handled separately.

Authentication answers:

> Who is the user?

Authorization answers:

> Is this user allowed to access this board/task?

For board requests, the backend checks whether the logged-in user's ID exists in the board's `members` array.

For example:

```js
Board.findOne({
  _id: boardId,
  members: userId
});
```

This prevents a logged-in user from accessing a board just by changing the board ID in the URL/request.

Board owners have additional permissions:

* Rename board
* Delete board

Tasks also check board membership before they can be updated or deleted.

---

# MongoDB Models

The project uses four main MongoDB models.

### User

Stores:

```text
name
email
passwordHash
createdAt
updatedAt
```

### Board

Stores:

```text
name
owner
members
createdAt
updatedAt
```

### Task

Stores:

```text
board
title
description
status
assignee
createdBy
createdAt
updatedAt
```

### Activity

Stores:

```text
board
user
task
action
message
createdAt
updatedAt
```

---

# Task Drag and Drop

The task cards use the browser's native HTML5 drag-and-drop API.

When dragging starts, the task ID is stored in `dataTransfer`:

```js
e.dataTransfer.setData("taskId", task._id);
```

When the task is dropped onto another column, the frontend sends the new status to the backend.

For example:

```text
Todo
  ↓
In Progress
```

results in an API update similar to:

```json
{
  "status": "in-progress"
}
```

The database is then updated and the change is broadcast to the board's Socket.IO room.

---

# Real-Time Updates

When a user opens a board, the frontend creates a Socket.IO connection.

It then sends:

```text
board:join
```

with the board ID.

The server uses the board ID as the Socket.IO room:

```js
socket.join(boardId);
```

When a database operation succeeds, the backend emits an event to that room.

For example, after creating a task:

```js
io.to(boardId).emit("task:created", task);
```

Other clients listening for the event update their React state without needing to reload the page.

The main event flow is:

```text
User A
   |
   | creates/updates task
   ↓
Express API
   |
   | save to MongoDB
   ↓
MongoDB
   |
   | successful update
   ↓
Socket.IO
   |
   ↓
Board room
   |
   ├── User B
   └── User C
```

---

# Concurrency

This project currently uses a simple last-write-wins approach.

There is no version number or conflict detection on tasks.

If two users edit the same task around the same time, both requests can reach the backend and the update processed later becomes the current database value.

For a future version, I would add optimistic concurrency using a version field.

For example:

```text
Client version: 4
        ↓
Server checks database version
        ↓
       4 ?
      /   \
    yes    no
     ↓      ↓
 update   409 Conflict
 to 5
```

This would allow the application to detect when a user is editing an outdated version of a task.

---

# API Endpoints

## Authentication

### Register

```http
POST /api/auth/register
```

Example:

```json
{
  "name": "Ekaspreet",
  "email": "eka@example.com",
  "password": "password123"
}
```

### Login

```http
POST /api/auth/login
```

Example:

```json
{
  "email": "eka@example.com",
  "password": "password123"
}
```

---

## Boards

All board routes require a valid JWT.

```http
POST   /api/boards
GET    /api/boards
GET    /api/boards/:id
PATCH  /api/boards/:id
DELETE /api/boards/:id
```

Creating a board can also include member emails:

```json
{
  "name": "Project Board",
  "memberEmails": [
    "user1@example.com",
    "user2@example.com"
  ]
}
```

Only users who already exist in the database are added as members.

---

## Tasks

```http
POST   /api/boards/:id/tasks
GET    /api/boards/:id/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
```

---

## Activity

```http
GET /api/boards/:id/activity
```

The endpoint returns the latest 30 activities for the board.

---

# Error Handling

The backend has a common error-handling middleware and checks for common invalid requests.

Examples include:

* Missing authentication token
* Invalid or expired JWT
* Invalid MongoDB ID
* Board access denied
* Task access denied
* Missing board name
* Missing task title
* Invalid task status
* Invalid task assignee
* MongoDB/database errors
* Resource not found

---

# Current Limitations

This is intentionally a basic implementation, so there are several things that can still be improved.

* Socket.IO connections are not currently authenticated separately from the REST API.
* Socket room membership is not checked against board membership.
* No invitation/acceptance workflow for adding members.
* No different roles such as admin/member.
* No task ordering within the same column.
* No offline synchronization.
* No optimistic concurrency/version checking.
* No automated tests.
* No Docker configuration.
* No production deployment configuration.
* JWT is stored in `localStorage`, rather than using a more secure HTTP-only cookie approach.

---

# What I Learned From This Project

The main things I practiced while building this project were:

* Building REST APIs with Express
* Connecting Express to MongoDB using Mongoose
* Creating and using Mongoose models
* JWT authentication
* Password hashing with bcrypt
* Express middleware
* Backend authorization
* React state management
* Axios API calls
* HTML5 drag and drop
* Socket.IO rooms
* Real-time client updates
* Activity logging
* Handling API errors
* Managing frontend/backend environment variables

The most important part for me was understanding how the different pieces connect:

```text
React
  ↓
Axios
  ↓
Express API
  ↓
Authentication / Authorization
  ↓
Mongoose
  ↓
MongoDB

React
  ↕
Socket.IO
  ↕
Node.js
```

---

# Possible Improvements

If I continue this project, I would work on:

1. Socket authentication and board-level authorization
2. Optimistic concurrency using a version field
3. Proper member invitation flow
4. Board roles and permissions
5. Task ordering
6. Automated tests
7. Docker setup
8. Deployment
9. Better validation on both frontend and backend
10. More detailed activity history
