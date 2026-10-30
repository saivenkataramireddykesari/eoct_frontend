export interface AuthUser {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  manufacturing_unit?: string;
  is_active?: boolean;
}

export interface JwtPayload {
  sub?: string;
  exp?: number;
  [key: string]: any;
}

/**
 * Parses JWT token payload without external libraries.
 */
export function parseJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

/**
 * Checks if a JWT token is expired or will expire within 10 seconds.
 */
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  const payload = parseJwt(token);
  if (!payload || typeof payload.exp !== 'number') {
    // If token has no exp or invalid payload, consider it invalid/expired
    return true;
  }
  // payload.exp is in seconds, convert to milliseconds with 10s grace window
  return Date.now() >= payload.exp * 1000 - 10000;
}

/**
 * Clears stored auth tokens and user data.
 */
export function clearAuth(): void {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch (e) {
    console.error('Error clearing auth:', e);
  }
}

/**
 * Retrieves stored user and token if still valid.
 */
export function getStoredAuth(): { user: AuthUser | null; token: string | null; isValid: boolean } {
  try {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr || isTokenExpired(token)) {
      clearAuth();
      return { user: null, token: null, isValid: false };
    }

    const user: AuthUser = JSON.parse(userStr);
    return { user, token, isValid: true };
  } catch (e) {
    clearAuth();
    return { user: null, token: null, isValid: false };
  }
}

/**
 * Stores authentication data.
 */
export function setAuth(user: AuthUser, token: string): void {
  try {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
  } catch (e) {
    console.error('Error setting auth:', e);
  }
}
