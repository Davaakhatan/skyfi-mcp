import { EventEmitter } from 'events';
import { logger } from '@utils/logger';

/**
 * Global event emitter for SSE connections
 * Used to broadcast events to all connected clients
 */
class SSEEventEmitter extends EventEmitter {
  private static instance: SSEEventEmitter;

  private constructor() {
    super();
    this.setMaxListeners(100); // Allow up to 100 listeners
  }

  public static getInstance(): SSEEventEmitter {
    if (!SSEEventEmitter.instance) {
      SSEEventEmitter.instance = new SSEEventEmitter();
    }
    return SSEEventEmitter.instance;
  }

  /**
   * Emit event to all listeners
   */
  public broadcast(eventType: string, data: unknown): void {
    logger.debug('Broadcasting SSE event', { eventType, hasData: !!data });
    this.emit(eventType, data);
  }

  /**
   * Emit event to specific user
   */
  public emitToUser(userId: string, eventType: string, data: unknown): void {
    logger.debug('Emitting SSE event to user', { userId, eventType });
    this.emit(`${eventType}:${userId}`, data);
  }
}

export const sseEventEmitter = SSEEventEmitter.getInstance();

