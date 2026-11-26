import { findUserForSession } from '../services/auth.service.js';

export const SESSION_COOKIE_NAME = 'interview_session';

export async function requireAuth(request, response, next) {
  try {
    const result = await findUserForSession(request.cookies?.[SESSION_COOKIE_NAME]);
    if (!result) {
      return response.status(401).json({ success: false, message: 'Please sign in to continue.' });
    }

    request.user = result.user;
    request.session = result.session;
    next();
  } catch (error) {
    next(error);
  }
}
