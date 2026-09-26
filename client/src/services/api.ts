import type { AuthUser, Category, Privacy, RoomSummary, Participant } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const TOKEN_KEY = 'watchmate:token';

function normalizeRoomCode(roomCode: string) {
  return roomCode.trim().toUpperCase();
}

export class ApiError extends Error {
  code?: string;
  status: number;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    res = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
    });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.', 'NETWORK_ERROR');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, data?.error?.message || data?.message || 'Something went wrong.', data?.error?.code);
  }

  return data as T;
}

export interface AuthResponse {
  token: string;
  user: { id: string; name: string; email: string };
}

export function register(input: { name: string; email: string; password: string }) {
  return request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(input) });
}

export function login(input: { email: string; password: string }) {
  return request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(input) });
}

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function toAuthUser(user: AuthResponse['user']): AuthUser {
  return { userId: user.id, username: user.name, email: user.email, avatar: '🙂' };
}

export interface CreateRoomInput {
  name: string;
  category: Category;
  privacy: Privacy;
  youtubeUrl?: string;
  userId: string;
  username: string;
  avatar: string;
}

export function createRoom(input: CreateRoomInput) {
  return request<{ room: BackendRoom }>('/api/rooms', {
    method: 'POST',
    body: JSON.stringify({ name: input.name, videoId: input.youtubeUrl, privacy: input.privacy }),
  }).then(({ room }) => ({ room: normalizeRoom(room) }));
}

export function listRooms(category?: string) {
  const qs = category && category !== 'All' ? `?category=${encodeURIComponent(category)}` : '';
  return request<{ rooms: BackendRoom[] }>(`/api/rooms${qs}`).then(({ rooms }) => ({ rooms: rooms.map(normalizeRoom) }));
}

export function listLiveRooms() {
  return request<{ rooms: BackendRoom[] }>('/api/rooms/live').then(({ rooms }) => ({ rooms: rooms.map(normalizeRoom) }));
}

export function listMyRooms(token: string | null) {
  return request<{ rooms: BackendRoom[] }>('/api/rooms/my', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).then(({ rooms }) => ({ rooms: rooms.map(normalizeRoom) }));
}

export function getRoom(roomId: string) {
  return request<{ room: BackendRoom; participants?: BackendParticipant[] }>(`/api/rooms/${encodeURIComponent(roomId)}`)
    .then(({ room, participants = [] }) => ({ room: normalizeRoom(room), participants: participants.map(normalizeParticipant) }));
}

export function joinRoom(roomId: string, user: { userId: string; username: string; avatar: string }) {
  return request<{ room: BackendRoom }>(`/api/rooms/join`, {
    method: 'POST',
    body: JSON.stringify({ roomCode: normalizeRoomCode(roomId), ...user }),
  }).then(({ room }) => ({ room: normalizeRoom(room), participant: undefined as Participant | undefined }));
}

interface BackendParticipant {
  user: { _id?: string; name?: string } | string;
  role: 'host' | 'moderator' | 'participant';
}

interface BackendRoom {
  roomCode: string;
  name: string;
  host: { _id?: string; name?: string } | string;
  participants?: unknown[];
  viewerCount?: number;
  hostName?: string;
  videoId?: string;
  playState?: 'playing' | 'paused';
  currentTime?: number;
  privacy?: 'public' | 'private';
  isLive?: boolean;
  closedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

function normalizeRoom(room: BackendRoom): RoomSummary {
  const hostId = typeof room.host === 'string' ? room.host : room.host?._id || '';
  const hostName = typeof room.host === 'string' ? undefined : room.host?.name;
  return {
    roomId: room.roomCode,
    name: room.name,
    category: 'Other',
    privacy: room.privacy || 'private',
    isLive: room.isLive === true,
    closedAt: room.closedAt || null,
    hostId,
    hostName,
    videoId: room.videoId || null,
    currentTime: room.currentTime || 0,
    isPlaying: room.playState === 'playing',
    updatedAt: room.updatedAt || new Date().toISOString(),
    status: 'active',
    createdAt: room.createdAt || new Date().toISOString(),
    viewerCount: room.viewerCount ?? room.participants?.length ?? 0,
  };
}

function normalizeParticipant(participant: BackendParticipant): Participant {
  const user = typeof participant.user === 'string' ? { _id: participant.user } : participant.user;
  return {
    userId: user._id || '',
    roomId: '',
    username: user.name || 'Participant',
    avatar: '🙂',
    role: participant.role.toUpperCase() as Participant['role'],
    online: true,
    joinedAt: new Date().toISOString(),
  };
}
