
import express from 'express';
import passport from '../config/passport.js';

const router = express.Router();

/**
 * GET /auth/google
 * Initiates Google OAuth flow
 */
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account' // Always show account selector
  })
);

/**
 * GET /auth/google/callback
 * Google OAuth callback handler
 */
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL}?error=auth_failed`
  }),
  (req, res) => {
    // Successful authentication
    console.log(`✅ User logged in: ${req.user.email}`);
    res.redirect(process.env.FRONTEND_URL);
  }
);

/**
 * GET /auth/me
 * Returns current authenticated user
 */
router.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ 
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        picture: req.user.picture
      }
    });
  } else {
    res.status(401).json({ 
      error: 'Not authenticated',
      user: null
    });
  }
});

/**
 * POST /auth/logout
 * Logs out the current user
 */
router.post('/logout', (req, res) => {
  const userEmail = req.user?.email;
  
  req.logout((err) => {
    if (err) {
      console.error('❌ Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Session destroy error:', err);
      }
      
      res.clearCookie('connect.sid');
      console.log(`👋 User logged out: ${userEmail}`);
      res.json({ message: 'Logged out successfully' });
    });
  });
});

/**
 * GET /auth/status
 * Quick check if user is authenticated (for frontend polling)
 */
router.get('/status', (req, res) => {
  res.json({ 
    authenticated: req.isAuthenticated(),
    userId: req.user?.id || null
  });
});

export default router;