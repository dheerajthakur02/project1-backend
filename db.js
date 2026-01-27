import mongoose, { connect } from "mongoose";
import dotenv from "dotenv";

dotenv.config();

console.log("Mongo URL:", process.env.MONGO_URL);
const connectDB = async () =>{
mongoose
  .connect(process.env.MONGO_URL, {
    authSource: "admin",   // 👈 THIS IS THE KEY
  })
  .then(() => {
    console.log("✅ MongoDB connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });
}
export default connectDB