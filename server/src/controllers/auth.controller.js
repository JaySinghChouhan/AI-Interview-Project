import {
  deleteSession,
  loginUser,
  registerUser,
  sessionTtlMs,
} from '../services/auth.service.js';
import { SESSION_COOKIE_NAME } from '../middleware/auth.middleware.js';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

function validateCredentials({ name, email, password }, includeName) {
  if (includeName && (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80)) {
    return 'Name must be between 2 and 80 characters.';
  }

  if (
    typeof email !== 'string' ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return 'Enter a valid email address.';
  }

  if (
    typeof password !== 'string' ||
    password.length < 8 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    return 'Password must be at least 8 characters and no more than 72 bytes.';
  }

  return null;
}

function setSessionCookie(response, token) {
  response.cookie(SESSION_COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: sessionTtlMs,
  });
}

export async function register(request, response, next) {
  const body = request.body || {};
  const validationError = validateCredentials(body, true);
  if (validationError) {
    return response.status(400).json({ success: false, message: validationError });
  }

  try {
    const session = await registerUser(body);
    setSessionCookie(response, session.token);
    response.status(201).json({ success: true, data: { user: session.user } });
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }
    next(error);
  }
}

export async function login(request, response, next) {
  const body = request.body || {};
  const validationError = validateCredentials(body, false);
  if (validationError) {
    return response.status(400).json({ success: false, message: validationError });
  }

  try {
    const session = await loginUser(body);
    setSessionCookie(response, session.token);
    response.json({ success: true, data: { user: session.user } });
  } catch (error) {
    next(error);
  }
}

export function currentUser(request, response) {
  response.json({ success: true, data: { user: request.user } });
}

export async function logout(request, response, next) {
  const token = request.cookies?.[SESSION_COOKIE_NAME];
  response.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
  try {
    await deleteSession(token);
    response.json({ success: true, message: 'You have been signed out.' });
  } catch (error) {
    next(error);
  }
}
