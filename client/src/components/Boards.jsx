import { useEffect, useState } from "react";
import api from "../api";
import Board from "./Board";

export default function Boards({ user, onLogout }) {
  const [boards, setBoards] = useState([]);
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState("");
  const [memberEmails, setMemberEmails] = useState("");
  const [error, setError] = useState("");

  async function loadBoards() {
    try {
      const { data } = await api.get("/boards");
      setBoards(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load boards");
    }
  }

  useEffect(() => {
    loadBoards();
  }, []);

  async function createBoard(e) {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const emails = memberEmails
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

      const { data } = await api.post("/boards", {
        name,
        memberEmails: emails
      });

      setBoards((prev) => [data, ...prev]);
      setName("");
      setMemberEmails("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not create board");
    }
  }

  async function deleteBoard(board) {
    if (!confirm(`Delete "${board.name}"?`)) return;

    try {
      await api.delete(`/boards/${board._id}`);
      setBoards((prev) => prev.filter((b) => b._id !== board._id));
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete board");
    }
  }

  if (selected) {
    return (
      <Board
        boardId={selected}
        onBack={() => {
          setSelected(null);
          loadBoards();
        }}
      />
    );
  }

  return (
    <div className="dashboard">
      <header className="topbar">
        <div>
          <h1>My Task Boards</h1>
          <p className="muted">Logged in as {user.name} · {user.email}</p>
        </div>
        <button className="secondary" onClick={onLogout}>Logout</button>
      </header>

      <main className="dashboard-content">
        <form className="create-board" onSubmit={createBoard}>
          <h2>Create a board</h2>
          <input
            placeholder="Board name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Member emails, separated by commas (optional)"
            value={memberEmails}
            onChange={(e) => setMemberEmails(e.target.value)}
          />
          <button>Create board</button>
        </form>

        {error && <p className="error">{error}</p>}

        <div className="board-grid">
          {boards.map((board) => (
            <article className="board-card" key={board._id}>
              <h2>{board.name}</h2>
              <p>{board.members.length} member(s)</p>
              <div className="card-actions">
                <button onClick={() => setSelected(board._id)}>Open</button>
                <button className="danger secondary" onClick={() => deleteBoard(board)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>

        {!boards.length && <p className="muted">No boards yet. Create your first one.</p>}
      </main>
    </div>
  );
}
