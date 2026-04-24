
import express from 'express';
import passport from '../config/passport.js';

const router = express.Router();
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

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
  (req, res, next) => {
    passport.authenticate('google', (err, user) => {
      if (err) {
        console.error('❌ Google callback error:', err.message || err);
        console.log(`↪ Redirecting to frontend error URL: ${frontendUrl}?error=auth_error`);
        return res.redirect(`${frontendUrl}?error=auth_error`);
      }

      if (!user) {
        console.log(`↪ Redirecting to frontend failure URL: ${frontendUrl}?error=auth_failed`);
        return res.redirect(`${frontendUrl}?error=auth_failed`);
      }

      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error('❌ Login session error:', loginErr.message || loginErr);
          console.log(`↪ Redirecting to frontend session error URL: ${frontendUrl}?error=session_error`);
          return res.redirect(`${frontendUrl}?error=session_error`);
        }

        console.log(`✅ User logged in: ${user.email}`);
        console.log(`↪ Redirecting to frontend success URL: ${frontendUrl}`);
        return res.redirect(frontendUrl);
      });
    })(req, res, next);
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