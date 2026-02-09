import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken.js";
import generateOtp from "../utils/generateOTP.js";
import setCookie from "../utils/setCookie.js";

export const register = async (req, res) => {
  try {
    const { name, email, phone, password, exam } = req.body;
    const alreadyUser = await User.findOne({ $or: [{ email }, { phone }] });

    if (alreadyUser) {
      return res.status(400).json({
        message: "User already registered with this email id or phone",
        success: false,
      });
    }
    const user = new User({
      name,
      email,
      phone,
      password,
      exam,
    });
    await user.save();
    
    // Auto-login: Generate token and set cookie
    const token = generateToken(user.id, user.role);
    setCookie(res, token);

    return res.status(201).json({
      message: `Profile registered successfully`,
      success: true,
      data: user,
      token, // Optional: return token to frontend if needed
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
      success: false,
    });
  }
};

export const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "User not found, please signup",
        success: false,
      });
    }
    const compare = await bcrypt.compare(password, user.password);
    if (!compare) {
      return res.status(400).json({
        message: "Incorrect password!!",
        success: false,
      });
    }
    const token = generateToken(user.id, user.role);
    setCookie(res, token);
    user.token = token;

   

    return res.status(200).json({
      message: `Login successfully! Welcome ${user.name}`,
      data: user,
      token: token,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
      success: false,
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }
    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
      success: false,
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, exam } = req.body;
    const user = await User.findByIdAndUpdate(
      userId,
      { name, phone, exam },
      { new: true, runValidators: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }
    return res.status(200).json({
      message: "Profile updated successfully",
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
      success: false,
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        message: "Both old and new passwords are required",
        success: false,
      });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Incorrect old password",
        success: false,
      });
    }
    user.password = newPassword;
    await user.save();
    return res.status(200).json({
      message: "Password changed successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
      success: false,
    });
  }
};

export const logout = (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    return res.status(200).json({
      message: "Logged out successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
      success: false,
    });
  }
};

export const sendOtpForResetPasswordToUser = async (req, res) => {
  try {
    const { phone, email } = req.body;
    const user = await User.findOne({
      $or: [{ phone }, { email }],
    });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }
    const otp = generateOtp();

    user.otp = otp;
    user.otpExpireTime = Date.now() + 10 * 60 * 1000;
    await user.save();

    return res.status(200).json({
      message:
        "OTP for resest password sent successfully!!, OTP valid only for 10 minutes",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
      success: false,
    });
  }
};

export const changePasswordUsingOtp = async (req, res) => {
  try {
    const { newPassword, otp, email } = req.body;
    const user = await User.findOne({ email });
    if (Date.now() > user.otpExpireTime) {
      return res.status(400).json({ message: "OTP expired", success: false });
    }
    if (user.otp != otp) {
      return res.status(400).json({ message: "Invalid otp!!", success: false });
    }
    user.otp = "";
    const comparePassword = await bcrypt.compare(newPassword, user.password);
    if (comparePassword) {
      return res.status(400).json({
        message: "Password can not be same with existing password!",
        success: false,
      });
    }
    user.password = newPassword;
    await user.save();
    return res
      .status(200)
      .json({ message: "Password updated successfully!!", success: true });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
      success: false,
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    return res.status(200).json({
      message: "All users",
      data: users,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
      success: false,
    });
  }
};
