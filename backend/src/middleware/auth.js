
/**
 * Middleware to require authentication
 * Returns 401 if user is not authenticated
 */
export const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ 
    error: 'Unauthorized',
    message: 'Please sign in to access this resource'
  });
};

/**
 * Middleware to optionally attach user if authenticated
 * Does not block request if not authenticated
 */
export const optionalAuth = (req, res, next) => {
  // User is already attached by passport if authenticated
  next();
};