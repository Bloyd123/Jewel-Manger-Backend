import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import RefreshToken from '../models/RefreshToken.js';
import logger from './logger.js';

/**
 * Token Manager Utility
 * Manages JWT access tokens and refresh tokens
 */

class TokenManager {
  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET ;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY; 
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY; 

      console.log('JWT_ACCESS_SECRET Loaded:', !!this.accessTokenSecret);
  }

  /**
   * Generate access token (JWT)
   * @param {Object} payload - Token payload
   * @param {String} payload.userId - User ID
   * @param {String} payload.organizationId - Organization ID
   * @param {String} payload.role - User role
   * @param {String} expiresIn - Token expiry (default: 15m)
   * @returns {String} JWT access token
   */
  generateAccessToken(payload, expiresIn = this.accessTokenExpiry) {
    try {
      const token = jwt.sign(
        {
          userId: payload.userId,
          organizationId: payload.organizationId,
          role: payload.role,
          email: payload.email,
          type: 'access',
        },
        this.accessTokenSecret,
        {
          expiresIn,
          issuer: 'jewelry-erp',
          audience: 'jewelry-erp-users',
        }
      );

      logger.debug(`Access token generated for user: ${payload.userId}`);
      return token;
    } catch (error) {
      logger.error('Error generating access token:', error);
      throw new Error('Failed to generate access token');
    }
  }

  /**
   * Generate refresh token
   * @param {Object} payload - Token payload
   * @param {String} payload.userId - User ID
   * @param {String} payload.organizationId - Organization ID
   * @param {String} expiresIn - Token expiry (default: 7d)
   * @returns {String} JWT refresh token
   */
  generateRefreshToken(payload, expiresIn = this.refreshTokenExpiry) {
    try {
      const token = jwt.sign(
        {
          userId: payload.userId,
          organizationId: payload.organizationId,
          tokenId: crypto.randomBytes(16).toString('hex'),
          type: 'refresh',
        },
        this.refreshTokenSecret,
        {
          expiresIn,
          issuer: 'jewelry-erp',
          audience: 'jewelry-erp-users',
        }
      );

      logger.debug(`Refresh token generated for user: ${payload.userId}`);
      return token;
    } catch (error) {
      logger.error('Error generating refresh token:', error);
      throw new Error('Failed to generate refresh token');
    }
  }

  /**
   * Generate both access and refresh tokens
   * @param {Object} user - User object
   * @param {String} ipAddress - User's IP address
   * @param {String} userAgent - User's browser/device info
   * @returns {Object} { accessToken, refreshToken }
   */
  async generateTokenPair(user, ipAddress = null, userAgent = null) {
    try {
      const payload = {
        userId: user._id.toString(),
     organizationId: user.organizationId ? user.organizationId.toString() : null,
        role: user.role,
        email: user.email,
      };

      // Generate tokens
      const accessToken = this.generateAccessToken(payload);
      const refreshToken = this.generateRefreshToken(payload);

      // Decode refresh token to get expiry
      const decoded = jwt.decode(refreshToken);
      const expiresAt = new Date(decoded.exp * 1000);

      // Store refresh token in database
      await RefreshToken.create({
        userId: user._id,
        organizationId: user.organizationId,
        token: refreshToken,
        tokenId: decoded.tokenId,
        expiresAt,
        ipAddress,
        userAgent,
      });

      logger.info(`Token pair generated for user: ${user._id}`);

      return {
        accessToken,
        refreshToken,
        expiresIn: this.accessTokenExpiry,
      };
    } catch (error) {
      logger.error('Error generating token pair:', error);
      throw new Error('Failed to generate token pair');
    }
  }

  /**
   * Verify access token
   * @param {String} token - JWT access token
   * @returns {Object} Decoded token payload
   */
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'jewelry-erp',
        audience: 'jewelry-erp-users',
      });

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        logger.debug('Access token expired');
        throw new Error('Access token expired');
      } else if (error.name === 'JsonWebTokenError') {
        logger.warn('Invalid access token');
        throw new Error('Invalid access token');
      }

      logger.error('Error verifying access token:', error);
      throw new Error('Token verification failed');
    }
  }

  /**
   * Verify refresh token
   * @param {String} token - JWT refresh token
   * @returns {Object} Decoded token payload
   */
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'jewelry-erp',
        audience: 'jewelry-erp-users',
      });

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        logger.debug('Refresh token expired');
        throw new Error('Refresh token expired');
      } else if (error.name === 'JsonWebTokenError') {
        logger.warn('Invalid refresh token');
        throw new Error('Invalid refresh token');
      }

      logger.error('Error verifying refresh token:', error);
      throw new Error('Token verification failed');
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {String} refreshToken - Refresh token
   * @param {String} ipAddress - User's IP address
   * @param {String} userAgent - User's browser/device info
   * @returns {Object} { accessToken, refreshToken }
   */
  async refreshAccessToken(refreshToken, ipAddress = null, userAgent = null) {
    try {
      // Verify refresh token
      const decoded = this.verifyRefreshToken(refreshToken);

      // Check if refresh token exists in database and is not revoked
      const storedToken = await RefreshToken.findOne({
        tokenId: decoded.tokenId,
        userId: decoded.userId,
        isRevoked: false,
      });

      if (!storedToken) {
        throw new Error('Invalid or revoked refresh token');
      }

      // Check if token is expired
      if (storedToken.expiresAt < new Date()) {
        await storedToken.revoke();
        throw new Error('Refresh token expired');
      }

      // Update last used info
      await storedToken.updateLastUsed(ipAddress);

      // Generate new access token
      const newAccessToken = this.generateAccessToken({
        userId: decoded.userId,
        organizationId: decoded.organizationId,
        role: decoded.role,
        email: decoded.email,
      });

      // Optionally rotate refresh token (recommended for security)
      let newRefreshToken = refreshToken;
      if (process.env.ROTATE_REFRESH_TOKEN === 'true') {
        // Revoke old token
        await storedToken.revoke();

        // Generate new refresh token
        const payload = {
          userId: decoded.userId,
          organizationId: decoded.organizationId,
        };

        newRefreshToken = this.generateRefreshToken(payload);
        const newDecoded = jwt.decode(newRefreshToken);
        const expiresAt = new Date(newDecoded.exp * 1000);

        // Store new refresh token
        await RefreshToken.create({
          userId: decoded.userId,
          organizationId: decoded.organizationId,
          token: newRefreshToken,
          tokenId: newDecoded.tokenId,
          expiresAt,
          ipAddress,
          userAgent,
        });
      }

      logger.info(`Access token refreshed for user: ${decoded.userId}`);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: this.accessTokenExpiry,
      };
    } catch (error) {
      logger.error('Error refreshing access token:', error);
      throw error;
    }
  }

  /**
   * Revoke refresh token
   * @param {String} refreshToken - Refresh token to revoke
   * @returns {Boolean} Success status
   */
  async revokeRefreshToken(refreshToken) {
    try {
      const decoded = jwt.decode(refreshToken);

      if (!decoded || !decoded.tokenId) {
        throw new Error('Invalid refresh token');
      }

      const storedToken = await RefreshToken.findOne({
        tokenId: decoded.tokenId,
      });

      if (storedToken) {
        await storedToken.revoke();
        logger.info(`Refresh token revoked: ${decoded.tokenId}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error revoking refresh token:', error);
      throw error;
    }
  }

  /**
   * Revoke all refresh tokens for a user
   * @param {String} userId - User ID
   * @returns {Number} Number of revoked tokens
   */
  async revokeAllUserTokens(userId) {
    try {
      const result = await RefreshToken.updateMany(
        { userId, isRevoked: false },
        {
          isRevoked: true,
          revokedAt: new Date(),
        }
      );

      logger.info(`All tokens revoked for user: ${userId} (${result.modifiedCount} tokens)`);
      return result.modifiedCount;
    } catch (error) {
      logger.error('Error revoking all user tokens:', error);
      throw error;
    }
  }

  /**
   * Clean expired refresh tokens from database
   * @returns {Number} Number of deleted tokens
   */
  async cleanExpiredTokens() {
    try {
      const result = await RefreshToken.deleteMany({
        expiresAt: { $lt: new Date() },
      });

      logger.info(`Cleaned ${result.deletedCount} expired refresh tokens`);
      return result.deletedCount;
    } catch (error) {
      logger.error('Error cleaning expired tokens:', error);
      return 0;
    }
  }

  /**
   * Get all active refresh tokens for a user
   * @param {String} userId - User ID
   * @returns {Array} Array of refresh tokens
   */
  async getUserTokens(userId) {
    try {
      return await RefreshToken.find({
        userId,
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });
    } catch (error) {
      logger.error('Error fetching user tokens:', error);
      return [];
    }
  }

  /**
   * Decode token without verification (for debugging)
   * @param {String} token - JWT token
   * @returns {Object} Decoded token payload
   */
  decodeToken(token) {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      logger.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   * @param {String} token - JWT token
   * @returns {Boolean} True if expired
   */
  isTokenExpired(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) return true;

      return Date.now() >= decoded.exp * 1000;
    } catch (error) {
      return true;
    }
  }

  /**
   * Get token expiry time
   * @param {String} token - JWT token
   * @returns {Date|null} Expiry date
   */
  getTokenExpiry(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) return null;

      return new Date(decoded.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate password reset token
   * @param {String} userId - User ID
   * @returns {String} Reset token
   */
  generatePasswordResetToken(userId) {
    try {
      const token = jwt.sign({ userId, type: 'password_reset' }, this.accessTokenSecret, {
        expiresIn: '1h',
      });

      logger.debug(`Password reset token generated for user: ${userId}`);
      return token;
    } catch (error) {
      logger.error('Error generating password reset token:', error);
      throw new Error('Failed to generate password reset token');
    }
  }

  /**
   * Generate email verification token
   * @param {String} userId - User ID
   * @param {String} email - User email
   * @returns {String} Verification token
   */
  generateEmailVerificationToken(userId, email) {
    try {
      const token = jwt.sign(
        { userId, email, type: 'email_verification' },
        this.accessTokenSecret,
        { expiresIn: '24h' }
      );

      logger.debug(`Email verification token generated for user: ${userId}`);
      return token;
    } catch (error) {
      logger.error('Error generating email verification token:', error);
      throw new Error('Failed to generate email verification token');
    }
  }

  /**
   * Verify special token (password reset, email verification)
   * @param {String} token - Special token
   * @param {String} expectedType - Expected token type
   * @returns {Object} Decoded token payload
   */
  verifySpecialToken(token, expectedType) {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret);

      if (decoded.type !== expectedType) {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }

      throw new Error('Token verification failed');
    }
  }
}

// Export singleton instance
export default new TokenManager();
