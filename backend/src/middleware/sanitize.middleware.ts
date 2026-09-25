import { Request, Response, NextFunction } from 'express';
import sanitizeHtml from 'sanitize-html';

// Password fields must never be sanitized: HTML stripping can silently truncate
// values containing '<' or '>', corrupting stored hashes and locking users out.
const SENSITIVE_FIELDS = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'confirmPassword',
  'password_hash',
]);

export const stripHtml = (value: string): string =>
  sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  });

const sanitizeValue = (value: any, key?: string): any => {
  if (key && SENSITIVE_FIELDS.has(key)) return value;
  if (typeof value === 'string') {
    return stripHtml(value);
  }
  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item));
  }
  if (value !== null && typeof value === 'object') {
    return Object.keys(value).reduce((acc, key) => {
      acc[key] = sanitizeValue(value[key], key);
      return acc;
    }, {} as { [key: string]: any });
  }
  return value;
};

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }
  next();
};
