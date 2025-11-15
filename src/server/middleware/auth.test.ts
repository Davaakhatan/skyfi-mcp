import { Request, Response, NextFunction } from 'express';
import { authenticate, optionalAuth } from './auth';
import { AuthenticationError } from '@utils/errors';

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  describe('authenticate', () => {
    it('should call next() with AuthenticationError when no API key provided', async () => {
      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
    });

    it('should call next() with AuthenticationError when API key is too short', async () => {
      mockRequest.headers = {
        authorization: 'Bearer short',
      };

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.any(AuthenticationError)
      );
    });

    it('should call next() when valid API key is provided', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-api-key-12345',
      };

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith();
      expect((mockRequest as any).apiKey).toBe('valid-api-key-12345');
    });

    it('should accept ApiKey scheme', async () => {
      mockRequest.headers = {
        authorization: 'ApiKey valid-api-key-12345',
      };

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith();
      expect((mockRequest as any).apiKey).toBe('valid-api-key-12345');
    });
  });

  describe('optionalAuth', () => {
    it('should call next() when no API key provided', async () => {
      await optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should attach API key when provided', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-api-key-12345',
      };

      await optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith();
      expect((mockRequest as any).apiKey).toBe('valid-api-key-12345');
    });
  });
});

