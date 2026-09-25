export type Role = 'HOST' | 'MODERATOR' | 'PARTICIPANT';

export type Category =
  | 'Movies'
  | 'Anime'
  | 'Gaming'
  | 'Music'
  | 'Sports'
  | 'Education'
  | 'Comedy'
  | 'Other';

export type Privacy = 'public' | 'private';

export interface LocalUser {
  userId: string;
  username: string;
  avatar: string;
}

export interface AuthUser extends LocalUser {
  email: string;
}

export interface RoomSummary {
  roomId: string;
  name: string;
  category: Category;
  privacy: Privacy;
  isLive: boolean;
  closedAt: string | null;
  hostId: string;
  hostName?: string;
  videoId: string | null;
  currentTime: number;
  isPlaying: boolean;
  updatedAt: string;
  status: 'active' | 'closed';
  createdAt: string;
  viewerCount?: number;
}

export interface Participant {
  userId: string;
  roomId: string;
  username: string;
  avatar: string;
  role: Role;
  online: boolean;
  joinedAt: string;
}

export interface ChatMessage {
  messageId: string;
  userId: string;
  username: string;
  text: string;
  timestamp: string;
  system?: boolean;
}

export type ReactionEmoji = '❤️' | '😂' | '🔥' | '👏' | '😮';
