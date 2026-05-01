const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: String,
  description: String,
  projectId: String,
  assignedTo: String,
  status: {
    type: String,
    default: "todo"
  },
  deadline: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Task", taskSchema);