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
import imageRoutes from "./routes/imageRoutes.js";
import shortAsnwerRoutes from "./routes/shortAnswer.route.js";
import summarizeGroupRoutes from "./routes/summarizeGroup.route.js";
import retellRoutes from "./routes/retell.route.js";
import respondRoutes from "./routes/respondSituation.js";
import summarizeTextRoutes from "./routes/wriitng/summarizeTextRoutes.js";
import essayRoutes from "./routes/wriitng/essayRoutes.js";
import readingMultiChoiceMultiAnswerRoutes from "./routes/readingMultiChoiceMultiAnswer.route.js";
import readingMultiChoiceSingleAnswerRoutes from "./routes/readingMultiChoiceSingleAnswer.route.js";
import readingFIBDropdownRoutes from "./routes/readingFIBDropdown.route.js";
import sstRoutes from "./routes/listening/sstRoutes.js";
import hscRoutes from "./routes/listening/hscRoutes.js";
import chooseSingleAnswerRoute from "./routes/listening/chooseSingleAnswerRoute.js";
import selectMissingWordRoute from "./routes/listening/selectMissingWordRoute.js";
import HIWRoutes from "./routes/listening/HIWRoutes.js";
app.use("/api/hiw", HIWRoutes);
app.use("/api/select-missing-word", selectMissingWordRoute);
app.use("/api/choose-single-answer", chooseSingleAnswerRoute);


app.use("/api/hsc", hscRoutes);
app.use("/api/summarize-text", summarizeTextRoutes);
app.use("/api/essay", essayRoutes);
app.use("/api/sst", sstRoutes);


import { connectCloudinary } from "./config/cloudinary.js";

app.use("/api/repeat-sentence", repeatRoutes);
app.use("/api/image", imageRoutes);
app.use("/api/short-answer", shortAsnwerRoutes);
app.use("/api/summarize-group", summarizeGroupRoutes);
app.use("/api/retell-lecture", retellRoutes);
app.use("/api/respond-situation", respondRoutes);
app.use("/api/reading-fib-dropdown", readingFIBDropdownRoutes);
app.use(
  "/api/reading-multi-choice-multi-answer",
  readingMultiChoiceMultiAnswerRoutes,
);
app.use(
  "/api/reading-multi-choice-single-answer",
  readingMultiChoiceSingleAnswerRoutes,
);
import readingFIBDragDropRoutes from "./routes/readingFIBDragDrop.route.js";
app.use("/api/reading-fib-drag-drop", readingFIBDragDropRoutes);

import readingReorderRoutes from "./routes/readingReorder.route.js";
app.use("/api/reading-reorder", readingReorderRoutes);

import listeningFIBRoutes from "./routes/listening/listeningFIBRoutes.js";
app.use("/api/listening-fib", listeningFIBRoutes);

import listeningMultiChoiceMultiAnswerRoutes from "./routes/listening/listeningMultiChoiceMultiAnswerRoutes.js";
app.use("/api/listening-multi-choice-multi-answer", listeningMultiChoiceMultiAnswerRoutes);

import writeFromDictationRoutes from "./routes/listening/writeFromDictationRoute.js";
app.use("/api/write-from-dictation", writeFromDictationRoutes);

app.use("/hello", (req, res) => {
  res.send("Hello from the server!");
});
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on the port ${PORT}`);
});

app.get("/", (req, res) => {
  res.send("Server is working");
});
