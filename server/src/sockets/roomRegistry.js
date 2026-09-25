export default class RoomRegistry {
  constructor() {
    this.entries = new Map();
  }

  key(roomId, userId) {
    return `${roomId}:${userId}`;
  }

  register({ roomId, userId, socketId, role }) {
    this.entries.set(this.key(roomId, userId), { roomId, userId, socketId, role });
  }

  unregister(roomId, userId, socketId) {
    const key = this.key(roomId, userId);
    const entry = this.entries.get(key);
    if (entry?.socketId === socketId) this.entries.delete(key);
  }

  updateRole(roomId, userId, role) {
    const entry = this.entries.get(this.key(roomId, userId));
    if (entry) entry.role = role;
  }

  get(roomId, userId) {
    return this.entries.get(this.key(roomId, userId));
  }

  isOnline(roomId, userId) {
    return this.entries.has(this.key(roomId, userId));
  }

  hasRole(roomId, role) {
    return [...this.entries.values()].some((entry) => entry.roomId === roomId && entry.role === role);
  }
}
