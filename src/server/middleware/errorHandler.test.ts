import { Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler, requestIdMiddleware } from './errorHandler';
import { AppError, NotFoundError } from '@utils/errors';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      path: '/test',
      method: 'GET',
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  describe('errorHandler', () => {
    it('should handle AppError correctly', () => {
      const error = new NotFoundError('Resource');
      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'NOT_FOUND',
            message: 'Resource not found',
          }),
        })
      );
    });

    it('should handle unknown errors', () => {
      const error = new Error('Unknown error');
      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
          }),
        })
      );
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 with error details', () => {
      notFoundHandler(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'NOT_FOUND',
            path: '/test',
          }),
        })
      );
    });
  });

  describe('requestIdMiddleware', () => {
    it('should generate request ID if not present', () => {
      requestIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.headers!['x-request-id']).toBeDefined();
      expect(mockResponse.setHeader).toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should use existing request ID if present', () => {
      mockRequest.headers = { 'x-request-id': 'existing-id' };
      
      requestIdMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.headers!['x-request-id']).toBe('existing-id');
    });
  });
});

