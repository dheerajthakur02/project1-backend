import mongoose from "mongoose";
import generateNumber from "../utils/generateNumber.js";
const readAloudSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: `RA-${generateNumber()}`,
    },
    name: {
      type: String,
      required: [true, "question name is required"],
    },
    text: {
      type: String,
      required: [true, "question content is required"],
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Difficult"],
    },
    isPredictive: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("readaloud", readAloudSchema);
