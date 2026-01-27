export const authorizeAdmin = () => {
    return (req, res, next) => {
      // Ensure req.user is populated by previous authMiddleware
      if (req.user && req.user.role === 'admin') {
        next();
      } else {
        res.status(403).json({ success: false, message: 'Access denied: Admins only' });
      }
    };
  };
