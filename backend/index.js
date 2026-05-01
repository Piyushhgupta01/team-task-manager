require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const User = require("./models/user");
const Project = require("./models/project");
const Task = require("./models/Task");

const app = express();

// ✅ MIDDLEWARES
app.use(cors());
app.use(express.json());

// ✅ DB CONNECT
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// ================== AUTH MIDDLEWARE ==================
const auth = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) return res.status(401).json({ msg: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ msg: "Invalid token" });
  }
};

// ================== ROUTES ==================

app.get("/", (req, res) => {
  res.send("API working 🚀");
});

// ================== AUTH ==================

// 🔹 SIGNUP
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: "All fields required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ msg: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role
    });

    await user.save();

    res.json({ msg: "Signup successful" });

  } catch {
    res.status(500).json({ msg: "Server error" });
  }
});

// 🔹 LOGIN
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Wrong password" });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });

  } catch {
    res.status(500).json({ msg: "Server error" });
  }
});

// 🔹 PROFILE
app.get("/profile", auth, async (req, res) => {
  const user = await User.findById(req.user.userId).select("-password");
  res.json(user);
});

// ================== PROJECT ==================

app.post("/project", auth, async (req, res) => {
  const { name, description, members } = req.body;

  const project = new Project({
    name,
    description,
    members,
    createdBy: req.user.userId
  });

  await project.save();
  res.json(project);
});

app.get("/projects", auth, async (req, res) => {
  const projects = await Project.find({ createdBy: req.user.userId });
  res.json(projects);
});

// ================== TASK ==================

app.post("/task", auth, async (req, res) => {
  const { title, description, projectId, assignedTo, deadline } = req.body;

  const task = new Task({
    title,
    description,
    projectId,
    assignedTo,
    deadline
  });

  await task.save();
  res.json(task);
});

app.get("/tasks/:projectId", auth, async (req, res) => {
  const tasks = await Task.find({ projectId: req.params.projectId });
  res.json(tasks);
});

app.put("/task/:id", auth, async (req, res) => {
  const task = await Task.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(task);
});

// ================== DASHBOARD ==================

app.get("/dashboard", auth, async (req, res) => {
  const total = await Task.countDocuments();
  const completed = await Task.countDocuments({ status: "done" });
  const pending = await Task.countDocuments({ status: "todo" });

  const overdue = await Task.countDocuments({
    deadline: { $lt: new Date() },
    status: { $ne: "done" }
  });

  res.json({ total, completed, pending, overdue });
});

// ================== SERVER ==================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT} 🚀`);
});