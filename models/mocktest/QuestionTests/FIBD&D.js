import mongoose from "mongoose";

const FIBDSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    ReadingFIBDragDrops: [
      { type: mongoose.Schema.Types.ObjectId, ref: "ReadingFIBDragDrop" },
    ],
  },
  { timestamps: true }
);

FIBDSchema.pre("save", function () {
  if (this.ReadingFIBDragDrops.length > 5) {
    return next(new Error("FIBD cannot exceed 5 questions"));
  }
 
});

export default mongoose.model("FIBD", FIBDSchema);
