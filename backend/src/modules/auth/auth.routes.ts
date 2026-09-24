import { Router } from 'express';
import { authService } from './auth.service';
import { registerSchema, loginSchema } from './auth.validators';
import { validate, asyncHandler, sendSuccess, requireAuth } from '../../common/middleware';
import { env } from '../../config/env';

const router = Router();

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: (env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// POST /api/v1/auth/register
router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);

    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    sendSuccess(res, {
      user: result.user,
      accessToken: result.accessToken,
    }, 201);
  })
);

// POST /api/v1/auth/login
router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);

    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    sendSuccess(res, {
      user: result.user,
      accessToken: result.accessToken,
    });
  })
);

// POST /api/v1/auth/refresh
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        error: { code: 'TOKEN_INVALID', message: 'No refresh token provided', requestId: req.requestId },
      });
      return;
    }

    const result = await authService.refresh(refreshToken);

    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

    sendSuccess(res, {
      accessToken: result.accessToken,
    });
  })
);

// POST /api/v1/auth/logout
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    res.clearCookie('refreshToken', { path: '/api/v1/auth' });

    sendSuccess(res, { message: 'Logged out successfully' });
  })
);

// GET /api/v1/auth/me (convenience endpoint)
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    sendSuccess(res, { user: req.user });
  })
);

// GET /api/v1/auth/check-username
router.get(
  '/check-username',
  asyncHandler(async (req, res) => {
    const username = (req.query.username as string) || '';
    const result = await authService.checkUsername(username);
    sendSuccess(res, result);
  })
);

export const authRouter = router;
