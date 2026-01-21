import User from "../models/user.model.js";

export const checkPracticeLimit = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.body.userId; // Handle both auth middleware and manual userId passing if needed
    
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // specific permissions for admin
    if (user.role === 'admin') {
        return next();
    }

    if (!user.isPremium) {
      if (user.practiceAttemptCount >= 10) {
        return res.status(403).json({ 
          message: "PRACTICE_LIMIT_REACHED",
          isPremium: false,
          limit: 10
        });
      }
      
      // Increment count
      user.practiceAttemptCount += 1;
      await user.save();
    }

    next();
  } catch (error) {
    console.error("Practice Limit Middleware Error:", error);
    res.status(500).json({ message: "Server error checking practice limit" });
  }
};
