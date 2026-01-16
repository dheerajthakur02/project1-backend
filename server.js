import express, { json } from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./db.js";
dotenv.config();

//import routes
import authRoutes from "./routes/auth.route.js";
import readAloudRoutes from "./routes/readAloud.route.js";
import attemptRoutes from "./routes/attempt.route.js";

const app = express();

const isDevelopment = process.env.NODE_ENV !== "production";

const corsOptions = {
  origin: function (origin, callback) {
    if (isDevelopment) {
      return callback(null, true);
    }

    const allowedOrigins = ["http://localhost:5174", "http://localhost:5173"];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
};

app.use(cors(corsOptions));
app.use(json());
app.use(cookieParser());
connectDB();

// Connect Cloudinary
connectCloudinary();
//api
app.use("/api/auth", authRoutes);
app.use("/api/read-aloud", readAloudRoutes);
app.use("/api/attempts", attemptRoutes);

import repeatRoutes from "./routes/repeat.route.js";
import imageRoutes from "./routes/imageRoutes.js"
import shortAsnwerRoutes from "./routes/shortAnswer.route.js"
import summarizeGroupRoutes from "./routes/summarizeGroup.route.js"
import retellRoutes from "./routes/retell.route.js"
import respondRoutes from "./routes/respondSituation.js"
import summarizeTextRoutes from "./routes/wriitng/summarizeTextRoutes.js"
import essayRoutes from "./routes/wriitng/essayRoutes.js"

app.use("/api/summarize-text", summarizeTextRoutes);
app.use("/api/essay", essayRoutes); 
import readingFIBDropdownRoutes from "./routes/readingFIBDropdown.route.js"

import { connectCloudinary } from "./config/cloudinary.js";

app.use("/api/repeat-sentence", repeatRoutes);
app.use("/api/image", imageRoutes);
app.use("/api/short-answer", shortAsnwerRoutes)
app.use("/api/summarize-group", summarizeGroupRoutes)
app.use("/api/retell-lecture", retellRoutes)
app.use("/api/respond-situation", respondRoutes)
app.use("/api/reading-fib-dropdown", readingFIBDropdownRoutes)
import readingMultiChoiceMultiAnswerRoutes from "./routes/readingMultiChoiceMultiAnswer.route.js"
app.use("/api/reading-multi-choice-multi-answer", readingMultiChoiceMultiAnswerRoutes)

app.use('/hello', (req, res) => {
  res.send('Hello from the server!');
});
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on the port ${PORT}`);
});

app.get("/", (req, res) => {
  res.send("Server is working");
});
