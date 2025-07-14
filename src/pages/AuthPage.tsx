import React, { useState } from "react";
import { register, login, logout } from "@/lib/auth";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (mode === "login") {
        const res = await login(email, password);
        setUser(res.user);
      } else {
        const res = await register(email, password);
        setUser(res.user);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  return (
    <div style={{ maxWidth: 400, margin: "40px auto", padding: 24, boxShadow: "0 2px 8px #ccc", borderRadius: 8 }}>
      <h2>{user ? `Welcome, ${user.email}` : mode === "login" ? "Login" : "Register"}</h2>
      {user ? (
        <>
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: "100%", marginBottom: 8 }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: "100%", marginBottom: 8 }}
          />
          {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}
          <button type="submit" style={{ width: "100%", marginBottom: 8 }}>
            {mode === "login" ? "Login" : "Register"}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            style={{ width: "100%" }}
          >
            {mode === "login" ? "Need an account? Register" : "Already have an account? Login"}
          </button>
        </form>
      )}
    </div>
  );
}
