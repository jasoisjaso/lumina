import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database/knex';
import { config } from '../config';

/**
 * Authentication Service
 * Handles user registration, login, JWT token generation, and validation
 */

export interface User {
  id: number;
  family_id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'member';
  color: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserRegistrationData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  family_id: number;
  role?: 'admin' | 'member';
  color?: string;
}

export interface TokenPayload {
  userId: number;
  email: string;
  familyId: number;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

class AuthService {
  private readonly SALT_ROUNDS = 10;
  private readonly ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
  private readonly REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compare a plain text password with a hashed password
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT access token
   */
  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });
  }

  /**
   * Generate JWT refresh token
   */
  generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
    });
  }

  /**
   * Verify and decode a JWT token
   */
  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, config.jwtSecret) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Store refresh token in database
   */
  async storeRefreshToken(userId: number, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await db('refresh_tokens').insert({
      user_id: userId,
      token,
      expires_at: expiresAt,
    });
  }

  /**
   * Validate refresh token from database
   */
  async validateRefreshToken(token: string): Promise<boolean> {
    const refreshToken = await db('refresh_tokens')
      .where({ token })
      .andWhere('revoked', false)
      .andWhere('expires_at', '>', new Date())
      .first();

    return !!refreshToken;
  }

  /**
   * Revoke a refresh token
   */
  async revokeRefreshToken(token: string): Promise<void> {
    await db('refresh_tokens')
      .where({ token })
      .update({
        revoked: true,
        revoked_at: new Date(),
      });
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(userId: number): Promise<void> {
    await db('refresh_tokens')
      .where({ user_id: userId })
      .update({
        revoked: true,
        revoked_at: new Date(),
      });
  }

  /**
   * Register a new user
   */
  async registerUser(data: UserRegistrationData): Promise<User> {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error('Invalid email format');
    }

    // Check if email already exists
    const existingUser = await db('users').where({ email: data.email }).first();
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Validate password strength (minimum 6 characters)
    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Hash password
    const passwordHash = await this.hashPassword(data.password);

    // Insert user
    const [userId] = await db('users').insert({
      family_id: data.family_id,
      email: data.email,
      password_hash: passwordHash,
      first_name: data.first_name,
      last_name: data.last_name,
      role: data.role || 'member',
      color: data.color || null,
    });

    // Fetch and return the created user
    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      throw new Error('Failed to create user');
    }

    return user;
  }

  /**
   * Authenticate user with email and password
   */
  async loginUser(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    // Find user by email
    const user = await db('users').where({ email }).first();
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await this.comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      familyId: user.family_id,
      role: user.role,
    };

    const accessToken = this.generateAccessToken(tokenPayload);
    const refreshToken = this.generateRefreshToken(tokenPayload);

    // Store refresh token
    await this.storeRefreshToken(user.id, refreshToken);

    return {
      user,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 minutes in seconds
      },
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    // Verify the refresh token JWT
    const payload = this.verifyToken(refreshToken);

    // Validate refresh token in database
    const isValid = await this.validateRefreshToken(refreshToken);
    if (!isValid) {
      throw new Error('Invalid or expired refresh token');
    }

    // Generate new access token
    const accessToken = this.generateAccessToken({
      userId: payload.userId,
      email: payload.email,
      familyId: payload.familyId,
      role: payload.role,
    });

    return {
      accessToken,
      refreshToken, // Return same refresh token
      expiresIn: 900,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: number): Promise<User | null> {
    const user = await db('users').where({ id: userId }).first();
    return user || null;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const user = await db('users').where({ email }).first();
    return user || null;
  }

  /**
   * Update user profile
   */
  async updateUser(userId: number, updates: Partial<User>): Promise<User> {
    // Remove sensitive fields that shouldn't be updated directly
    const { id, password_hash, created_at, updated_at, ...allowedUpdates } = updates as any;

    await db('users').where({ id: userId }).update({
      ...allowedUpdates,
      updated_at: new Date(),
    });

    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Change user password
   */
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await this.comparePassword(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long');
    }

    // Hash and update password
    const newPasswordHash = await this.hashPassword(newPassword);
    await db('users').where({ id: userId }).update({
      password_hash: newPasswordHash,
      updated_at: new Date(),
    });

    // Revoke all existing refresh tokens for security
    await this.revokeAllUserTokens(userId);
  }
}

export default new AuthService();
