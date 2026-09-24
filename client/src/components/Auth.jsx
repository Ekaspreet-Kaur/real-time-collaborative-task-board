import { useState } from "react";
import api from "../api";

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");

    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const { data } = await api.post(endpoint, form);

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.response?.data?.message || "Request failed");
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Task Board</h1>
        <p className="muted">{mode === "login" ? "Sign in" : "Create an account"}</p>

        {mode === "register" && (
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        )}

        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        {error && <p className="error">{error}</p>}

        <button>{mode === "login" ? "Login" : "Register"}</button>

        <button
          type="button"
          className="link-button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
        >
          {mode === "login" ? "Need an account? Register" : "Already registered? Login"}
        </button>
      </form>
    </div>
  );
}
