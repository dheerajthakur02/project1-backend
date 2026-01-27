import mongoose from "mongoose";

const WFDSchema = new mongoose.Schema({
  title: { type: String, required: true },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "WFDQuestion" }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("WFD", WFDSchema);