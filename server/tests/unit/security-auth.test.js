import { describe, it, expect } from 'vitest';
import { validateObjectId } from '../../src/middleware/validate.js';
import { authenticate } from '../../src/middleware/authenticate.js';
import { env } from '../../src/config/env.js';

describe('Security & Validation: ObjectId and Auth Guarding', () => {
  describe('validateObjectId middleware', () => {
    it('rejects invalid ObjectId formats with 400 and INVALID_ID code', () => {
      const validator = validateObjectId('id');
      const invalidIds = ['123', 'undefined', 'null', 'not-a-valid-hex-id-xyz', '6aed6d2d8768ebb5dd0f2b4z'];

      for (const id of invalidIds) {
        let error = null;
        const req = { params: { id } };
        const res = {};
        const next = (err) => { error = err; };

        validator(req, res, next, id);
        expect(error, `Failed for id: ${id}`).toBeDefined();
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe('INVALID_ID');
      }
    });

    it('passes valid 24-character hex MongoDB ObjectIds', () => {
      const validator = validateObjectId('id');
      const validIds = [
        '6aed6d2d8768ebb5dd0f2b4b',
        '507f1f77bcf86cd799439011',
        '000000000000000000000000',
      ];

      for (const id of validIds) {
        let error = null;
        let nextCalled = false;
        const req = { params: { id } };
        const res = {};
        const next = (err) => {
          error = err;
          nextCalled = true;
        };

        validator(req, res, next, id);
        expect(nextCalled).toBe(true);
        expect(error).toBeUndefined();
      }
    });
  });

  describe('authenticate middleware', () => {
    it('accepts x-test-user-id header in test environment', () => {
      const req = {
        headers: { 'x-test-user-id': 'user_test_12345' },
      };
      const res = {};
      let called = false;
      const next = (err) => {
        expect(err).toBeUndefined();
        called = true;
      };

      authenticate(req, res, next);
      expect(called).toBe(true);
      expect(req.user.id).toBe('user_test_12345');
      expect(req.auth.userId).toBe('user_test_12345');
    });

    it('rejects unauthenticated requests without token or test header with 401', () => {
      const originalEnv = env.NODE_ENV;
      try {
        env.NODE_ENV = 'production';
        const req = { headers: {} };
        const res = {};
        let error = null;
        const next = (err) => { error = err; };

        authenticate(req, res, next);
        expect(error).toBeDefined();
        expect(error.statusCode).toBe(401);
        expect(error.code).toBe('UNAUTHORIZED');
      } finally {
        env.NODE_ENV = originalEnv;
      }
    });

    it('strictly forbids unverified JWT decoding in production mode', () => {
      const originalEnv = env.NODE_ENV;
      try {
        env.NODE_ENV = 'production';
        // Mock token payload { sub: 'victim_user' }
        const forgedPayload = Buffer.from(JSON.stringify({ sub: 'victim_user' })).toString('base64url');
        const forgedToken = `header.${forgedPayload}.signature`;

        const req = {
          headers: {
            authorization: `Bearer ${forgedToken}`,
          },
        };
        const res = {};
        let error = null;
        const next = (err) => { error = err; };

        authenticate(req, res, next);
        expect(error).toBeDefined();
        expect(error.statusCode).toBe(401);
        expect(error.code).toBe('UNAUTHORIZED');
        expect(req.user).toBeUndefined();
      } finally {
        env.NODE_ENV = originalEnv;
      }
    });
  });
});
