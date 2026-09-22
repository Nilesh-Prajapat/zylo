/**
 * Media Provider abstraction.
 * Decouples Zylo business logic from live media transport provider.
 */

export interface LiveKitTokenOptions {
  roomName: string;
  participantIdentity: string;
  participantName: string;
  isPublisher: boolean;
}

export interface MediaProvider {
  createRoom(roomName: string): Promise<void>;
  generateToken(options: LiveKitTokenOptions): Promise<string>;
  endRoom(roomName: string): Promise<void>;
  getParticipantCount(roomName: string): Promise<number>;
}
