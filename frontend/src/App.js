import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [loggedIn, setLoggedIn] = useState(
    localStorage.getItem("token") ? true : false
  );

  return !loggedIn ? (
    <Login setLoggedIn={setLoggedIn} />
  ) : (
    <Dashboard setLoggedIn={setLoggedIn} />
  );
}

export default App;

// 🔐 LOGIN + SIGNUP
function Login({ setLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);

  // LOGIN
  const login = async () => {
    if (!email || !password) {
      alert("Enter email & password");
      return;
    }

    const res = await fetch("http://localhost:5001/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const d = await res.json();

    if (!d.token) {
      alert("Login failed");
      return;
    }

    localStorage.setItem("token", d.token);
    setLoggedIn(true);
  };

  // SIGNUP
  const signup = async () => {
    if (!email || !password) {
      alert("Enter email & password");
      return;
    }

    const res = await fetch("http://localhost:5001/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const d = await res.json();
    alert(d.msg);

    if (d.msg === "Signup successful") {
      setIsSignup(false);
    }
  };

  return (
    <div className="login-page">
      <div className="glass">
        <h2>{isSignup ? "Signup" : "Login"}</h2>

        <input
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={isSignup ? signup : login}>
          {isSignup ? "Signup" : "Login"}
        </button>

        <p style={{ marginTop: 10 }}>
          {isSignup ? "Already have account?" : "New user?"}
          <span
            style={{
              color: "#667eea",
              cursor: "pointer",
              marginLeft: 5
            }}
            onClick={() => setIsSignup(!isSignup)}
          >
            {isSignup ? "Login" : "Signup"}
          </span>
        </p>
      </div>
    </div>
  );
}

// 📊 DASHBOARD (same as before)
function Dashboard({ setLoggedIn }) {
  const token = localStorage.getItem("token");

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");

  const [taskTitle, setTaskTitle] = useState("");
  const [deadline, setDeadline] = useState("");

  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState("");

  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0
  });

  const loadProjects = async () => {
    const res = await fetch("http://localhost:5001/projects", {
      headers: { Authorization: token }
    });
    const d = await res.json();
    setProjects(d);
    if (d.length > 0) setSelectedProject(d[0]._id);
  };

  const loadDashboard = async () => {
    const res = await fetch("http://localhost:5001/dashboard", {
      headers: { Authorization: token }
    });
    const d = await res.json();
    setStats(d);
  };

  const createTask = async () => {
    if (!taskTitle) return alert("Enter task");

    await fetch("http://localhost:5001/task", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token
      },
      body: JSON.stringify({
        title: taskTitle,
        projectId: selectedProject,
        deadline
      })
    });

    setTaskTitle("");
    setDeadline("");
    loadTasks();
    loadDashboard();
  };

  const loadTasks = async () => {
    if (!selectedProject) return;

    const res = await fetch(
      `https://team-task-manager-production-e154.up.railway.app/tasks/${selectedProject}`,
      {
        headers: { Authorization: token }
      }
    );
    const d = await res.json();
    setTasks(d);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setLoggedIn(false);
  };

  useEffect(() => {
    loadProjects();
    loadDashboard();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [selectedProject]);

  return (
    <div className="container">
      <div className="sidebar">
        <button onClick={loadDashboard}>Dashboard</button>
        <button onClick={loadTasks}>Tasks</button>
        <button onClick={logout}>Logout</button>
      </div>

      <div className="main">
        <div style={{ width: "100%", maxWidth: "420px" }}>
          <h1 style={{ textAlign: "center" }}>Team Task Manager</h1>

          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="cards">
            <div className="card">Total: {stats.total}</div>
            <div className="card green">Done: {stats.completed}</div>
            <div className="card red">Pending: {stats.pending}</div>
            <div className="card overdue">Overdue: {stats.overdue}</div>
          </div>

          <div className="glass">
            <h3>Create Task</h3>
            <input
              value={taskTitle}
              placeholder="Task title"
              onChange={(e) => setTaskTitle(e.target.value)}
            />
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
            <button onClick={createTask}>Add Task</button>
          </div>

          <input
            placeholder="Search task..."
            onChange={(e) => setSearch(e.target.value)}
          />

          {tasks
            .filter((t) =>
              t.title.toLowerCase().includes(search.toLowerCase())
            )
            .map((t) => {
              const isOverdue =
                t.deadline &&
                new Date(t.deadline) < new Date() &&
                t.status !== "done";

              return (
                <div
                  key={t._id}
                  className={`task ${isOverdue ? "overdue-task" : ""}`}
                >
                  <span>{t.title}</span>
                  <span
                    className={t.status === "done" ? "done" : "todo"}
                  >
                    {t.status}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}