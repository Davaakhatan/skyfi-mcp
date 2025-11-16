import { Request, Response, NextFunction } from 'express';
import { sseEventEmitter } from './eventEmitter';
import { logger } from '@utils/logger';

/**
 * SSE connection manager
 */
class SSEConnectionManager {
  private connections: Map<string, Response[]> = new Map();

  /**
   * Add a new SSE connection
   */
  public addConnection(connectionId: string, res: Response): void {
    if (!this.connections.has(connectionId)) {
      this.connections.set(connectionId, []);
    }
    this.connections.get(connectionId)!.push(res);

    logger.debug('SSE connection added', { connectionId, total: this.connections.get(connectionId)!.length });
  }

  /**
   * Remove an SSE connection
   */
  public removeConnection(connectionId: string, res: Response): void {
    const connections = this.connections.get(connectionId);
    if (connections) {
      const index = connections.indexOf(res);
      if (index > -1) {
        connections.splice(index, 1);
        if (connections.length === 0) {
          this.connections.delete(connectionId);
        }
      }
    }
    logger.debug('SSE connection removed', { connectionId });
  }

  /**
   * Send data to all connections for a given connection ID
   */
  public sendToConnection(connectionId: string, data: unknown): void {
    const connections = this.connections.get(connectionId);
    if (connections) {
      const dataString = `data: ${JSON.stringify(data)}\n\n`;
      connections.forEach((res) => {
        try {
          res.write(dataString);
        } catch (error) {
          logger.error('Error sending SSE data', { error, connectionId });
        }
      });
    }
  }

  /**
   * Get connection count for a connection ID
   */
  public getConnectionCount(connectionId: string): number {
    return this.connections.get(connectionId)?.length || 0;
  }
}

const connectionManager = new SSEConnectionManager();

/**
 * SSE middleware - sets up Server-Sent Events connection
 */
export const sseMiddleware = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Send initial connection message
  res.write(': connected\n\n');

  next();
};

/**
 * Create SSE connection handler
 */
export const createSSEConnection = (
  req: Request,
  res: Response,
  connectionId: string
): void => {
  // Add connection
  connectionManager.addConnection(connectionId, res);

  // Set up event listeners
  const eventTypes = [
    'order:update',
    'monitoring:update',
    'notification',
  ];

  // Listen for user-specific events
  const userId = (req as any).userId;
  if (userId) {
    eventTypes.forEach((eventType) => {
      sseEventEmitter.on(`${eventType}:${userId}`, (data) => {
        connectionManager.sendToConnection(connectionId, {
          type: eventType,
          data,
        });
      });
    });
  }

  // Listen for general events
  eventTypes.forEach((eventType) => {
    sseEventEmitter.on(eventType, (data) => {
      connectionManager.sendToConnection(connectionId, {
        type: eventType,
        data,
      });
    });
  });

  // Handle client disconnect
  req.on('close', () => {
    connectionManager.removeConnection(connectionId, res);
    // Remove event listeners
    if (userId) {
      eventTypes.forEach((eventType) => {
        sseEventEmitter.removeAllListeners(`${eventType}:${userId}`);
      });
    }
    eventTypes.forEach((eventType) => {
      sseEventEmitter.removeAllListeners(eventType);
    });
    logger.debug('SSE connection closed', { connectionId });
  });

  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (error) {
      clearInterval(heartbeat);
      connectionManager.removeConnection(connectionId, res);
    }
  }, 30000);

  // Clear heartbeat on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
  });
};

/**
 * Send SSE event to connection
 */
export const sendSSEEvent = (
  connectionId: string,
  eventType: string,
  data: unknown
): void => {
  connectionManager.sendToConnection(connectionId, {
    type: eventType,
    data,
    timestamp: new Date().toISOString(),
  });
};

export default connectionManager;

