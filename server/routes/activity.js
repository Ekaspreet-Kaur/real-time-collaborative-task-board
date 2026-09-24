import express from "express";
import mongoose from "mongoose";
import Activity from "../models/Activity.js";
import Board from "../models/Board.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

router.get("/:id/activity", auth, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid board ID" });
    }

    const board = await Board.findOne({
      _id: req.params.id,
      members: req.user.id
    });

    if (!board) return res.status(403).json({ message: "You cannot access this board" });

    const activities = await Activity.find({ board: board._id })
      .populate("user", "name email")
      .populate("task", "title")
      .sort({ createdAt: -1 })
      .limit(30);

    res.json(activities);
  } catch (err) {
    next(err);
  }
});

export default router;
