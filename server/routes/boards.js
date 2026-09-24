import express from "express";
import mongoose from "mongoose";
import Board from "../models/Board.js";
import User from "../models/User.js";
import Task from "../models/Task.js";
import Activity from "../models/Activity.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

function validId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function getAuthorizedBoard(boardId, userId) {
  if (!validId(boardId)) return null;
  return Board.findOne({
    _id: boardId,
    members: userId
  });
}

router.use(auth);

router.post("/", async (req, res, next) => {
  try {
    const { name, memberEmails = [] } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Board name is required" });
    }

    const members = [req.user.id];

    for (const email of memberEmails) {
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (user && !members.some((id) => id.toString() === user._id.toString())) {
        members.push(user._id);
      }
    }

    const board = await Board.create({
      name: name.trim(),
      owner: req.user.id,
      members
    });

    res.status(201).json(await Board.findById(board._id).populate("members", "name email"));
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const boards = await Board.find({ members: req.user.id })
      .populate("members", "name email")
      .sort({ updatedAt: -1 });

    res.json(boards);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const board = await getAuthorizedBoard(req.params.id, req.user.id);

    if (!board) return res.status(403).json({ message: "You cannot access this board" });

    const [fullBoard, tasks, activities] = await Promise.all([
      Board.findById(board._id).populate("members", "name email"),
      Task.find({ board: board._id })
        .populate("assignee", "name email")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 }),
      Activity.find({ board: board._id })
        .populate("user", "name email")
        .populate("task", "title")
        .sort({ createdAt: -1 })
        .limit(30)
    ]);

    res.json({ board: fullBoard, tasks, activities });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const board = await getAuthorizedBoard(req.params.id, req.user.id);
    if (!board) return res.status(403).json({ message: "You cannot access this board" });

    if (board.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the owner can rename the board" });
    }

    if (!req.body.name?.trim()) {
      return res.status(400).json({ message: "Board name is required" });
    }

    board.name = req.body.name.trim();
    await board.save();

    req.app.get("io").to(board._id.toString()).emit("board:updated", board);
    res.json(board);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const board = await getAuthorizedBoard(req.params.id, req.user.id);
    if (!board) return res.status(403).json({ message: "You cannot access this board" });

    if (board.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the owner can delete the board" });
    }

    await Promise.all([
      Board.deleteOne({ _id: board._id }),
      Task.deleteMany({ board: board._id }),
      Activity.deleteMany({ board: board._id })
    ]);

    req.app.get("io").to(board._id.toString()).emit("board:deleted", { boardId: board._id });
    res.json({ message: "Board deleted" });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/tasks", async (req, res, next) => {
  try {
    const board = await getAuthorizedBoard(req.params.id, req.user.id);
    if (!board) return res.status(403).json({ message: "You cannot access this board" });

    const { title, description = "", assignee = null } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: "Task title is required" });
    }

    if (assignee && !board.members.some((m) => m.toString() === assignee)) {
      return res.status(400).json({ message: "Assignee must be a board member" });
    }

    const task = await Task.create({
      board: board._id,
      title: title.trim(),
      description,
      assignee,
      createdBy: req.user.id
    });

    const populated = await Task.findById(task._id)
      .populate("assignee", "name email")
      .populate("createdBy", "name email");

    const activity = await Activity.create({
      board: board._id,
      user: req.user.id,
      task: task._id,
      action: "TASK_CREATED",
      message: `${req.user.name} created task "${task.title}"`
    });

    const io = req.app.get("io");
    io.to(board._id.toString()).emit("task:created", populated);
    io.to(board._id.toString()).emit("activity:created", await activity.populate("user", "name email"));

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/tasks", async (req, res, next) => {
  try {
    const board = await getAuthorizedBoard(req.params.id, req.user.id);
    if (!board) return res.status(403).json({ message: "You cannot access this board" });

    const tasks = await Task.find({ board: board._id })
      .populate("assignee", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

export default router;
