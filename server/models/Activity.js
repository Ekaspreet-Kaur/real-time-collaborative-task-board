import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    board: { type: mongoose.Schema.Types.ObjectId, ref: "Board", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
    action: { type: String, required: true },
    message: { type: String, required: true }
  },
  { timestamps: true }
);

export default mongoose.model("Activity", activitySchema);
