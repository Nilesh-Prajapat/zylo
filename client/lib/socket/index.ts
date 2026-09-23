import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../api/axios-client';
import { ChatMessage, GiftTransaction } from '@/lib/types';

export type SocketCallback<T> = (data: T) => void;

class RealtimeSocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<SocketCallback<any>>> = new Map();
  private currentStreamId: string | null = null;

  public connect() {
    if (this.socket) {
      if (!this.socket.connected) {
        const token = getAccessToken();
        this.socket.auth = { token };
        this.socket.connect();
      }
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    const token = getAccessToken();

    this.socket = io(socketUrl, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected to realtime server:', this.socket?.id);
      if (this.currentStreamId) {
        this.socket?.emit('stream:join', { streamId: this.currentStreamId });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    // Bind all registered listeners cleanly to the socket instance
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((cb) => {
        this.socket?.off(event, cb);
        this.socket?.on(event, cb);
      });
    });
  }

  public disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
    this.currentStreamId = null;
  }

  public joinStream(streamId: string) {
    this.currentStreamId = streamId;
    if (!this.socket) this.connect();
    this.socket?.emit('stream:join', { streamId });
  }

  public leaveStream(streamId: string) {
    if (this.currentStreamId === streamId) {
      this.currentStreamId = null;
    }
    this.socket?.emit('stream:leave', { streamId });
  }

  public on<T>(event: string, callback: SocketCallback<T>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    if (!set.has(callback)) {
      set.add(callback);
      if (this.socket) {
        this.socket.off(event, callback);
        this.socket.on(event, callback);
      }
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
