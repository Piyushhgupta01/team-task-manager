require("dotenv").config({ path: "./.env" });

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const User = require("./models/user");
const Project = require("./models/project");
const Task = require("./models/task");

const app = express();

// ✅ MIDDLEWARES
app.use(cors());
app.use(express.json());

console.log("MONGO:", process.env.MONGO_URI);

// ✅ DB CONNECT
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// ================== AUTH MIDDLEWARE ==================
const auth = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) return res.status(401).json({ msg: "No token" });

  try {
    const decoded = jwt.verify(token, "secret");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ msg: "Invalid token" });
  }
};

// ================== ROUTES ==================

// 🔹 TEST
app.get("/", (req, res) => {
  res.send("API working 🚀");
});

// ================== AUTH ==================

// 🔹 SIGNUP
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ msg: "All fields required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
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

    res.json({ msg: "User registered successfully" });

  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// 🔹 LOGIN
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: "Enter email & password" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Wrong password" });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      "secret",
      { expiresIn: "1d" }
    );

    res.json({ token });

  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});
app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    // validation
    if (!email || !password) {
      return res.json({ msg: "All fields required" });
    }

    // check existing user
    const existing = await User.findOne({ email });
    if (existing) {
      return res.json({ msg: "User already exists" });
    }

    // create user
    const user = await User.create({ email, password });

    res.json({ msg: "Signup successful", user });
  } catch (err) {
    res.json({ msg: "Error" });
  }
});

// 🔹 PROFILE
app.get("/profile", auth, async (req, res) => {
  const user = await User.findById(req.user.userId).select("-password");
  res.json(user);
});

// ================== PROJECT ==================

// 🔹 CREATE PROJECT
app.post("/project", auth, async (req, res) => {
  try {
    const { name, description, members } = req.body;

    if (!name) {
      return res.status(400).json({ msg: "Project name required" });
    }

    const project = new Project({
      name,
      description,
      members,
      createdBy: req.user.userId
    });

    await project.save();

    res.json({ msg: "Project created", project });

  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// 🔹 GET PROJECTS
app.get("/projects", auth, async (req, res) => {
  const projects = await Project.find({
    createdBy: req.user.userId
  });

  res.json(projects);
});

// ================== TASK ==================

// 🔹 CREATE TASK (ASSIGN + DEADLINE)
app.post("/task", auth, async (req, res) => {
  try {
    const { title, description, projectId, assignedTo, deadline } = req.body;

    if (!title || !projectId) {
      return res.status(400).json({ msg: "Title & projectId required" });
    }

    const task = new Task({
      title,
      description,
      projectId,
      assignedTo,
      deadline
    });

    await task.save();

    res.json({ msg: "Task created", task });

  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// 🔹 GET TASKS BY PROJECT
app.get("/tasks/:projectId", auth, async (req, res) => {
  const tasks = await Task.find({ projectId: req.params.projectId });
  res.json(tasks);
});

// 🔹 UPDATE TASK STATUS
app.put("/task/:id", auth, async (req, res) => {
  const { status } = req.body;

  const task = await Task.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );

  res.json(task);
});

// ================== DASHBOARD ==================

// 🔹 DASHBOARD (WITH OVERDUE)
app.get("/dashboard", auth, async (req, res) => {
  try {
    const total = await Task.countDocuments();
    const completed = await Task.countDocuments({ status: "done" });
    const pending = await Task.countDocuments({ status: "todo" });

    const overdue = await Task.countDocuments({
      deadline: { $lt: new Date() },
      status: { $ne: "done" }
    });

    res.json({
      total,
      completed,
      pending,
      overdue
    });

  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// ================== SERVER ==================
app.listen(5001, () => {
  console.log("Server running on port 5001 🚀");
});