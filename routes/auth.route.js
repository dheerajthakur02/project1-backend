import express from "express";
import {
  register,
  signIn,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  sendOtpForResetPasswordToUser,
  changePasswordUsingOtp,
  getAllUsers,
} from "../controllers/auth.controller.js";
import { authorize } from "../middlewares/authMiddleware.js";
const router = express.Router();

router.post("/register", register);
router.post("/signin", signIn);
router.get("/users/all", getAllUsers);

router.get("/profile", authorize(), getProfile);
router.put("/profile", authorize(), updateProfile);
router.post("/change-password", authorize(), changePassword);
router.post("/logout", logout);
router.post("/send-password-reset-otp", sendOtpForResetPasswordToUser);
router.put("/change-password-with-otp", changePasswordUsingOtp);

export default router;
