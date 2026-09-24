import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import api from "../api";
import TaskCard from "./TaskCard";

const columns = [
  { id: "todo", label: "Todo" },
  { id: "in-progress", label: "In Progress" },
  { id: "done", label: "Done" }
];

export default function Board({ boardId, onBack }) {
  const [board, setBoard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState("");
  const [socketStatus, setSocketStatus] = useState("connecting");
  const [taskForm, setTaskForm] = useState(null);
  const [memberInput, setMemberInput] = useState("");

  const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

  async function loadBoard() {
    try {
      const { data } = await api.get(`/boards/${boardId}`);
      setBoard(data.board);
      setTasks(data.tasks);
      setActivities(data.activities);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load board");
    }
  }

  useEffect(() => {
    loadBoard();

    const socket = io(socketUrl);

    socket.on("connect", () => {
      setSocketStatus("connected");
      socket.emit("board:join", boardId);
    });

    socket.on("disconnect", () => setSocketStatus("disconnected"));

    socket.on("task:created", (task) => {
      setTasks((prev) => prev.some((t) => t._id === task._id) ? prev : [task, ...prev]);
    });

    socket.on("task:updated", (task) => {
      setTasks((prev) => prev.map((t) => t._id === task._id ? task : t));
    });

    socket.on("task:deleted", ({ taskId }) => {
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    });

    socket.on("activity:created", (activity) => {
      setActivities((prev) => [activity, ...prev].slice(0, 30));
    });

    socket.on("board:updated", (updatedBoard) => {
      setBoard((prev) => prev ? { ...prev, name: updatedBoard.name } : prev);
    });

    socket.on("board:deleted", () => onBack());

    return () => {
      socket.emit("board:leave", boardId);
      socket.disconnect();
    };
  }, [boardId]);

  async function createTask(e) {
    e.preventDefault();

    try {
      const { data } = await api.post(`/boards/${boardId}/tasks`, taskForm);
      setTasks((prev) => prev.some((t) => t._id === data._id) ? prev : [data, ...prev]);
      setTaskForm(null);
    } catch (err) {
      setError(err.response?.data?.message || "Could not create task");
    }
  }

  async function updateTask(id, changes) {
    try {
      const { data } = await api.patch(`/tasks/${id}`, changes);
      setTasks((prev) => prev.map((t) => t._id === data._id ? data : t));
      setTaskForm(null);
    } catch (err) {
      setError(err.response?.data?.message || "Could not update task");
    }
  }

  async function deleteTask(id) {
    if (!confirm("Delete this task?")) return;

    try {
      await api.delete(`/tasks/${id}`);
      setTasks((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete task");
    }
  }

  function dropTask(e, status) {
    e.preventDefault();
    const id = e.dataTransfer.getData("taskId");
    if (!id) return;
    updateTask(id, { status });
  }

  async function renameBoard() {
    const name = prompt("New board name:", board.name);
    if (!name || name === board.name) return;

    try {
      const { data } = await api.patch(`/boards/${boardId}`, { name });
      setBoard((prev) => ({ ...prev, name: data.name }));
    } catch (err) {
      setError(err.response?.data?.message || "Could not rename board");
    }
  }

  async function addMembersToBoard(e) {
    e.preventDefault();
    if (!memberInput.trim()) return;

    const emails = memberInput
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);

    if (!emails.length) {
      setError("Enter at least one valid email");
      return;
    }

    try {
      const { data } = await api.patch(`/boards/${boardId}/members`, { memberEmails: emails });
      setBoard((prev) => ({ ...prev, members: data.members }));
      setMemberInput("");
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not add members");
    }
  }

  const grouped = useMemo(() => {
    return Object.fromEntries(
      columns.map((column) => [
        column.id,
        tasks.filter((task) => task.status === column.id)
      ])
    );
  }, [tasks]);

  if (!board) {
    return <div className="loading">Loading board...</div>;
  }

  return (
    <div className="board-page">
      <header className="board-header">
        <div>
          <button className="link-button" onClick={onBack}>← Boards</button>
          <h1>{board.name}</h1>
          <p className="muted">
            {board.members.length} member(s) · Socket: <strong>{socketStatus}</strong>
          </p>
        </div>
        <div className="header-actions">
          <button onClick={() => setTaskForm({ title: "", description: "", assignee: "" })}>
            + Task
          </button>
          <button className="secondary" onClick={renameBoard}>Rename</button>
        </div>
      </header>

      <div className="board-toolbar">
        <div className="member-summary">
          {board.members.slice(0, 4).map((member) => (
            <span className="member-badge" key={member._id}>{member.name}</span>
          ))}
        </div>

        <form className="member-form" onSubmit={addMembersToBoard}>
          <input
            value={memberInput}
            onChange={(e) => setMemberInput(e.target.value)}
            placeholder="Add members by email"
          />
          <button type="submit" className="secondary">Add</button>
        </form>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      <div className="columns">
        {columns.map((column) => (
          <section
            className="column"
            key={column.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => dropTask(e, column.id)}
          >
            <div className="column-title">
              <h2>{column.label}</h2>
              <span>{grouped[column.id].length}</span>
            </div>

            {grouped[column.id].map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onEdit={(t) => setTaskForm(t)}
                onDelete={deleteTask}
              />
            ))}
          </section>
        ))}
      </div>

      <section className="activity">
        <h2>Recent activity</h2>
        {activities.length === 0 ? (
          <p className="muted">No activity yet.</p>
        ) : (
          activities.map((item) => (
            <div className="activity-item" key={item._id}>
              <strong>{item.user?.name || "User"}</strong>
              <span>{item.message.replace(`${item.user?.name || "User"} `, "")}</span>
              <small>{new Date(item.createdAt).toLocaleString()}</small>
            </div>
          ))
        )}
      </section>

      {taskForm && (
        <div className="modal-backdrop">
          <form
            className="modal"
            onSubmit={taskForm._id ? (e) => {
              e.preventDefault();
              updateTask(taskForm._id, {
                title: taskForm.title,
                description: taskForm.description,
                assignee: taskForm.assignee
              });
            } : createTask}
          >
            <h2>{taskForm._id ? "Edit task" : "Create task"}</h2>

            <input
              required
              placeholder="Title"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
            />

            <textarea
              placeholder="Description"
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
            />

            <select
              value={taskForm.assignee || ""}
              onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })}
            >
              <option value="">Unassigned</option>
              {board.members.map((member) => (
                <option value={member._id} key={member._id}>
                  {member.name} ({member.email})
                </option>
              ))}
            </select>

            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setTaskForm(null)}>
                Cancel
              </button>
              <button>Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
