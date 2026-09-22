import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../api/axios-client';
import { ChatMessage, GiftTransaction } from '@/lib/types';

export type SocketCallback<T> = (data: T) => void;

class RealtimeSocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<SocketCallback<any>>> = new Map();

  public connect() {
    if (this.socket && this.socket.connected) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    const token = getAccessToken();

    this.socket = io(socketUrl, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected to realtime server:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    // Re-bind all existing event listeners
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((cb) => {
        this.socket?.on(event, cb);
      });
    });
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public joinStream(streamId: string) {
    if (!this.socket) this.connect();
    this.socket?.emit('stream:join', { streamId });
  }

  public leaveStream(streamId: string) {
    this.socket?.emit('stream:leave', { streamId });
  }

  public on<T>(event: string, callback: SocketCallback<T>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  public off<T>(event: string, callback: SocketCallback<T>) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  public emit(event: string, payload: any) {
    if (!this.socket) this.connect();
    this.socket?.emit(event, payload);
  }

  public sendChatMessage(streamId: string, text: string, username: string, avatar: string) {
    this.emit('chat:send', { streamId, message: text });
  }

  public sendGift(streamId: string, giftName: string, coins: number, recipientName: string) {
    this.emit('gift:send', { streamId, giftName, coins, recipientName });
  }
}

export const socketClient = new RealtimeSocketClient();
