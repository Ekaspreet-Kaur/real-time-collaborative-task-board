import { useState } from "react";
import Auth from "./components/Auth";
import Boards from "./components/Boards";

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  });

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  return <Boards user={user} onLogout={logout} />;
}
