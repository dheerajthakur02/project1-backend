import dns from "dns";
dns.setServers(["8.8.8.8"]);

import express, { json } from "express"; // Restart Trigger v3
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

    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://pawan-pte.netlify.app",
      process.env.CLIENT_URL // Allow CLIENT_URL from env if set
    ].filter(Boolean); // Remove undefined/null if env var is missing

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

import bannerRoutes from "./routes/bannerRoutes.js";

//api
app.use("/api/auth", authRoutes);
app.use("/api/banner", bannerRoutes);
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
import speakingRoute from "./routes/mocktest/speakingRoute.js";
import writingRoute from "./routes/mocktest/writingRoute.js";
import listeningRoute from "./routes/mocktest/listeningRoute.js";
import RLRoutes from "./routes/mocktest/questionRoutes/rlRoutes.js";
import readingRoute from "./routes/mocktest/readingRoute.js";
import RSRoutes from "./routes/mocktest/questionRoutes/rsRoutes.js";
import DIRoutes from "./routes/mocktest/questionRoutes/diRoutes.js";
import ReTellRoutes from "./routes/mocktest/questionRoutes/reTellRoutes.js";
import sstGroupRoutes from "./routes/mocktest/questionRoutes/sstGroupRoutes.js";
import hiwRoutes from "./routes/mocktest/questionRoutes/hiwRoutes.js";
import sgdRoutes from "./routes/mocktest/questionRoutes/sgdRoutes.js";
import weRoutes from "./routes/mocktest/questionRoutes/weRoutes.js";
import wfdRoutes from "./routes/mocktest/questionRoutes/wfdRoutes.js";
import swtRoutes from "./routes/mocktest/questionRoutes/swtRoutes.js";
import fibRoutes from "./routes/mocktest/questionRoutes/fibRoutes.js";
import fibdRoutes from "./routes/mocktest/questionRoutes/fibd&dRoutes.js";
import roRoutes from "./routes/mocktest/questionRoutes/roRoutes.js";
import rtsRoutes from "./routes/mocktest/questionRoutes/rtsRoutes.js";
import fiblRoutes from "./routes/mocktest/questionRoutes/fiblRoutes.js";

app.use("/api/question/fibl", fiblRoutes);
app.use("/api/question/rts", rtsRoutes);
app.use("/api/question/ro", roRoutes);
app.use("/api/question/fibd", fibdRoutes);
app.use("/api/question/fib", fibRoutes);
app.use("/api/question/swt", swtRoutes);
app.use("/api/question/wfd", wfdRoutes);
app.use("/api/question/we", weRoutes);
app.use("/api/question/ra", RLRoutes);
app.use("/api/question/di", DIRoutes);
app.use("/api/question/rs", RSRoutes);
app.use("/api/question/rl", ReTellRoutes);
app.use("/api/question/sst", sstGroupRoutes);
app.use("/api/question/sgd", sgdRoutes);
app.use("/api/question/hiw", hiwRoutes);
app.use("/api/question/reading", readingRoute);
app.use("/api/question/speaking", speakingRoute);
app.use("/api/question/writing", writingRoute);
app.use("/api/question/listening", listeningRoute);

import fullMockTestRoutes from "./routes/mocktest/fullMockTestRoutes.js";
app.use("/api/mocktest/full", fullMockTestRoutes);

app.use("/api/hiw", HIWRoutes);
app.use("/api/select-missing-word", selectMissingWordRoute);
app.use("/api/choose-single-answer", chooseSingleAnswerRoute);

app.use("/api/hcs", hscRoutes);
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
app.use(
  "/api/listening-multi-choice-multi-answer",
  listeningMultiChoiceMultiAnswerRoutes,
);

import writeFromDictationRoutes from "./routes/listening/writeFromDictationRoute.js";
app.use("/api/write-from-dictation", writeFromDictationRoutes);

import paymentRoutes from "./routes/paymentRoutes.js";
app.use("/api/payment", paymentRoutes);

import voucherRoutes from "./routes/voucherRoutes.js";
app.use("/api/voucher", voucherRoutes);

import dashboardRoutes from "./routes/dashboardRoutes.js";
app.use("/api/dashboard", dashboardRoutes);

import videoRoutes from "./routes/videoRoutes.js";
app.use("/api/videos", videoRoutes);

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
