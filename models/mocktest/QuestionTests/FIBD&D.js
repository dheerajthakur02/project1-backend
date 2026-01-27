const FIBDSchema = new mongoose.Schema({
  title: { type: String, required: true },
  fibdQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: "FIBDQuestion" }]
});
// Max 5 questions for Reading section