import express from "express";
import mongoose from "mongoose";
import Task from "../models/Task.js";
import Board from "../models/Board.js";
import Activity from "../models/Activity.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

router.use(auth);

async function getTaskAndBoard(taskId, userId) {
  if (!mongoose.Types.ObjectId.isValid(taskId)) return null;

  const task = await Task.findById(taskId);
  if (!task) return null;

  const board = await Board.findOne({
    _id: task.board,
    members: userId
  });

  if (!board) return null;
  return { task, board };
}

router.patch("/:id", async (req, res, next) => {
  try {
    const result = await getTaskAndBoard(req.params.id, req.user.id);

    if (!result) {
      return res.status(403).json({ message: "Task not found or access denied" });
    }

    const { task, board } = result;
    const oldStatus = task.status;
    const oldAssignee = task.assignee?.toString() || null;

    if (req.body.title !== undefined) {
      if (!req.body.title.trim()) return res.status(400).json({ message: "Title cannot be empty" });
      task.title = req.body.title.trim();
    }

    if (req.body.description !== undefined) task.description = req.body.description;

    if (req.body.status !== undefined) {
      if (!["todo", "in-progress", "done"].includes(req.body.status)) {
        return res.status(400).json({ message: "Invalid task status" });
      }
      task.status = req.body.status;
    }

    if (req.body.assignee !== undefined) {
      if (req.body.assignee && !board.members.some((m) => m.toString() === req.body.assignee)) {
        return res.status(400).json({ message: "Assignee must be a board member" });
      }
      task.assignee = req.body.assignee || null;
    }

    await task.save();

    const populated = await Task.findById(task._id)
      .populate("assignee", "name email")
      .populate("createdBy", "name email");

    const activities = [];

    if (oldStatus !== task.status) {
      activities.push({
        board: board._id,
        user: req.user.id,
        task: task._id,
        action: "TASK_MOVED",
        message: `${req.user.name} moved "${task.title}" from ${oldStatus} to ${task.status}`
      });
    }

    if (oldAssignee !== (task.assignee?.toString() || null)) {
      activities.push({
        board: board._id,
        user: req.user.id,
        task: task._id,
        action: "TASK_ASSIGNED",
        message: `${req.user.name} changed the assignee of "${task.title}"`
      });
    }

    if (task.status === "done" && oldStatus !== "done") {
      activities.push({
        board: board._id,
        user: req.user.id,
        task: task._id,
        action: "TASK_COMPLETED",
        message: `${req.user.name} completed "${task.title}"`
      });
    }

    if (!activities.length) {
      activities.push({
        board: board._id,
        user: req.user.id,
        task: task._id,
        action: "TASK_UPDATED",
        message: `${req.user.name} updated "${task.title}"`
      });
    }

    const savedActivities = await Activity.insertMany(activities);

    const io = req.app.get("io");
    io.to(board._id.toString()).emit("task:updated", populated);

    for (const activity of savedActivities) {
      await activity.populate("user", "name email");
      io.to(board._id.toString()).emit("activity:created", activity);
    }

    res.json(populated);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const result = await getTaskAndBoard(req.params.id, req.user.id);

    if (!result) {
      return res.status(403).json({ message: "Task not found or access denied" });
    }

    const { task, board } = result;
    const taskId = task._id;

    await Task.deleteOne({ _id: taskId });

    const activity = await Activity.create({
      board: board._id,
      user: req.user.id,
      task: null,
      action: "TASK_DELETED",
      message: `${req.user.name} deleted "${task.title}"`
    });

    const io = req.app.get("io");
    io.to(board._id.toString()).emit("task:deleted", { taskId: taskId.toString() });
    io.to(board._id.toString()).emit("activity:created", await activity.populate("user", "name email"));

    res.json({ message: "Task deleted", taskId: taskId.toString() });
  } catch (err) {
    next(err);
  }
});

export default router;
