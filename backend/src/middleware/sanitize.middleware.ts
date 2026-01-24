import { Request, Response, NextFunction } from 'express';
import sanitizeHtml from 'sanitize-html';

const sanitizeValue = (value: any): any => {
  if (typeof value === 'string') {
    return sanitizeHtml(value, {
      allowedTags: [],
      allowedAttributes: {},
    });
  }
  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item));
  }
  if (value !== null && typeof value === 'object') {
    return Object.keys(value).reduce((acc, key) => {
      acc[key] = sanitizeValue(value[key]);
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
