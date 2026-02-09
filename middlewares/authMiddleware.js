import jwt from "jsonwebtoken";

export const authorize = (roles = []) => {
  return (req, res, next) => {
    const token =  req.cookies?.token ||                           // Cookie
    req.headers.authorization?.split(" ")[1] ||     // Authorization: Bearer <token>
    req.headers["x-access-token"] ||                // Custom header
    req.query?.token ||                             // Query param ?token=
    req.body?.token;   

    if (!token) {
      return res.status(401).json({ message: "Access token is missing" });
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;

      if (Array.isArray(roles) && roles.length === 0) {
        return next();
      }

      if (!decoded || !roles.includes(decoded?.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      next();
    } catch (err) {
      console.error("Authentication error:", err);
      res.status(403).json({ message: "Invalid token" });
    }
  };
};