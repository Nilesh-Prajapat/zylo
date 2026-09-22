import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { MediaProvider, LiveKitTokenOptions } from './media-provider';
import { env } from '../../config/env';
import { logger } from '../../common/logger';

export class LiveKitProvider implements MediaProvider {
  private roomService: RoomServiceClient;

  constructor() {
    // Convert wss:// to https:// for HTTP RoomServiceClient
    const httpUrl = env.LIVEKIT_URL.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
    this.roomService = new RoomServiceClient(httpUrl, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
  }

  async createRoom(roomName: string): Promise<void> {
    try {
      await this.roomService.createRoom({
        name: roomName,
        emptyTimeout: 10 * 60, // 10 mins
        maxParticipants: 1000,
      });
      logger.info('LiveKit room created', { roomName });
    } catch (err) {
      logger.warn('LiveKit room creation info', { roomName, message: (err as Error).message });
    }
  }

  async generateToken(options: LiveKitTokenOptions): Promise<string> {
    const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
      identity: options.participantIdentity,
      name: options.participantName,
      ttl: '4h',
    });

    at.addGrant({
      roomJoin: true,
      room: options.roomName,
      canPublish: options.isPublisher,
      canPublishData: true,
      canSubscribe: true,
    });

    return await at.toJwt();
  }

  async endRoom(roomName: string): Promise<void> {
    try {
      await this.roomService.deleteRoom(roomName);
      logger.info('LiveKit room ended', { roomName });
    } catch (err) {
      logger.warn('LiveKit room end error', { roomName, message: (err as Error).message });
    }
  }

  async getParticipantCount(roomName: string): Promise<number> {
    try {
      const participants = await this.roomService.listParticipants(roomName);
      return participants.length;
    } catch {
      return 0;
    }
  }
}

let instance: MediaProvider;

export function getMediaProvider(): MediaProvider {
  if (!instance) {
    instance = new LiveKitProvider();
  }
  return instance;
}
