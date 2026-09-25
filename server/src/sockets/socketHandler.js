import jwt from "jsonwebtoken";
import Room from "../models/Room.js";
import User from "../models/User.js";
import RoomRegistry from "./roomRegistry.js";
import { canControl, isHost, permissionError, roleName } from "./permissions.js";
import { extractYouTubeId } from "../utils/youtube.js";

const HOST_GRACE_MS = 15000;

const socketHandler = (io) => {
  const roomRegistry = new RoomRegistry();
  const hostGraceTimers = new Map();
  const pendingSockets = new Map();

  const participantsFor = async (room) => {
    const userIds = room.participants.map((participant) => participant.user);
    const users = await User.find({ _id: { $in: userIds } }).select("name");
    const names = new Map(users.map((user) => [user._id.toString(), user.name]));
    return room.participants.map((participant) => ({
      userId: participant.user.toString(),
      roomId: room.roomCode,
      username: names.get(participant.user.toString()) || "Participant",
      avatar: ":)",
      role: roleName(participant.role),
      online: roomRegistry.isOnline(room.roomCode, participant.user.toString()),
      joinedAt: room.createdAt,
    }));
  };

  const broadcastState = async (room) => io.to(room.roomCode).emit("room_state_updated", { participants: await participantsFor(room) });
  const broadcastRoomState = async (roomCode) => {
    const room = await Room.findOne({ roomCode });
    if (room) await broadcastState(room);
  };
  const hasActiveModerator = (roomCode) => roomRegistry.hasRole(roomCode, "moderator");
  const hasActiveHost = (roomCode) => roomRegistry.hasRole(roomCode, "host");
  const canManageJoinRequests = (room, socket, role) => (
    (role === "host" && room.host.toString() === socket.userId) ||
    (role === "moderator" && !hasActiveHost(room.roomCode))
  );
  const broadcastLiveUpdate = (room) => {
    io.emit("room_live_updated", {
      roomId: room.roomCode,
      isLive: room.isLive,
      closedAt: room.closedAt,
    });
  };
  const markRoomOffline = async (roomCode) => {
    hostGraceTimers.delete(roomCode);
    const room = await Room.findOne({ roomCode });
    if (!room || room.closedAt || hasActiveModerator(roomCode)) return;
    room.isLive = false;
    await room.save();
    broadcastLiveUpdate(room);
  };
  const scheduleHostGrace = (roomCode) => {
    if (hostGraceTimers.has(roomCode)) return;
    const timer = setTimeout(() => markRoomOffline(roomCode), HOST_GRACE_MS);
    hostGraceTimers.set(roomCode, timer);
  };

  const pendingKey = (roomCode, userId) => `${roomCode}:${userId}`;
  const pendingRequestsFor = async (room) => {
    const userIds = room.joinRequests.map((request) => request.user);
    const users = await User.find({ _id: { $in: userIds } }).select("name");
    const names = new Map(users.map((user) => [user._id.toString(), user.name]));
    return room.joinRequests.map((request) => ({
      userId: request.user.toString(),
      username: names.get(request.user.toString()) || "Participant",
      createdAt: request.createdAt,
    }));
  };

  const notifyJoinManagers = async (room) => {
    const requests = await pendingRequestsFor(room);
    for (const manager of io.sockets.sockets.values()) {
      const isHostManager = manager.roomId === room.roomCode && manager.role === "host" && manager.userId === room.host.toString();
      const isActingModerator = manager.roomId === room.roomCode && manager.role === "moderator" && !hasActiveHost(room.roomCode);
      if (isHostManager || isActingModerator) manager.emit("join_requests_updated", { requests });
    }
  };

  const emitSyncState = async (socket, room, participant) => {
    const normalizedVideoId = room.videoId ? extractYouTubeId(room.videoId) : null;
    if (normalizedVideoId && normalizedVideoId !== room.videoId) {
      room.videoId = normalizedVideoId;
      await room.save();
    }
    socket.emit("sync_state", {
      room: {
        roomId: room.roomCode,
        name: room.name,
        videoId: normalizedVideoId || room.videoId || null,
        currentTime: room.currentTime,
        isPlaying: room.playState === "playing",
        isLive: room.isLive === true,
        closedAt: room.closedAt,
      },
      participants: await participantsFor(room),
      you: { userId: participant.user.toString(), role: roleName(participant.role) },
    });
  };

  const authorizedRoom = async (socket) => {
    if (!socket.roomId || !socket.userId) return { room: null, role: null };
    const room = await Room.findOne({ roomCode: socket.roomId });
    const participant = room?.participants.find((item) => item.user.toString() === socket.userId);
    if (!room || !participant || room.closedAt) return { room: null, role: null };
    roomRegistry.updateRole(room.roomCode, socket.userId, participant.role);
    socket.role = participant.role;
    return { room, role: participant.role };
  };

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join_room", async ({ roomId, username, token }, acknowledge) => {
      try {
        if (!roomId || !token) {
          const message = !roomId ? "Room ID is required" : "Authentication token required";
          permissionError(socket, message);
          acknowledge?.({ ok: false, message });
          return;
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const room = await Room.findOne({ roomCode: roomId.toUpperCase() });
        if (!room) throw new Error("Room not found");
        if (room.closedAt) throw new Error("This room is closed");
        const participant = room.participants.find((item) => item.user.toString() === decoded.userId);
        const isPrivate = room.visibility === "private" || room.privacy === "private";
        if (!participant && isPrivate) {
          let request = room.joinRequests.find((item) => item.user.toString() === decoded.userId);
          if (!request) {
            room.joinRequests.push({ user: decoded.userId });
            await room.save();
            request = room.joinRequests.find((item) => item.user.toString() === decoded.userId);
          }
          socket.userId = decoded.userId;
          socket.username = username || "Guest";
          socket.pendingRoomId = room.roomCode;
          socket.pendingUserId = decoded.userId;
          pendingSockets.set(pendingKey(room.roomCode, decoded.userId), socket.id);
          socket.emit("join_request_pending", { roomId: room.roomCode, message: "Waiting for Host approval." });
          await notifyJoinManagers(room);
          acknowledge?.({ ok: true, pending: true, message: "Waiting for Host approval." });
          return;
        }
        if (!participant) throw new Error("You are not a participant of this room");

        socket.join(room.roomCode);
        socket.roomId = room.roomCode;
        socket.userId = decoded.userId;
        socket.username = username || "Guest";
        socket.role = participant.role;
        const previousEntry = roomRegistry.get(room.roomCode, decoded.userId);
        if (previousEntry && previousEntry.socketId !== socket.id) {
          const previousSocket = io.sockets.sockets.get(previousEntry.socketId);
          previousSocket?.leave(room.roomCode);
          if (previousSocket) {
            previousSocket.roomId = null;
            previousSocket.userId = null;
            previousSocket.username = null;
            previousSocket.role = null;
          }
        }
        roomRegistry.register({
          roomId: room.roomCode,
          userId: decoded.userId,
          socketId: socket.id,
          role: participant.role,
        });

        if (socket.role === "host") {
          const pendingTimer = hostGraceTimers.get(room.roomCode);
          if (pendingTimer) {
            clearTimeout(pendingTimer);
            hostGraceTimers.delete(room.roomCode);
          }
          room.isLive = true;
          room.closedAt = null;
          await room.save();
          io.emit("room_started", { roomId: room.roomCode });
          broadcastLiveUpdate(room);
        }

        const normalizedVideoId = room.videoId ? extractYouTubeId(room.videoId) : null;
        if (normalizedVideoId && normalizedVideoId !== room.videoId) {
          room.videoId = normalizedVideoId;
          await room.save();
        }

        const participants = await participantsFor(room);
        socket.emit("sync_state", {
          room: {
            roomId: room.roomCode,
            name: room.name,
            videoId: normalizedVideoId || room.videoId || null,
            currentTime: room.currentTime,
            isPlaying: room.playState === "playing",
            isLive: room.isLive === true,
            closedAt: room.closedAt,
          },
          participants,
          you: { userId: decoded.userId, role: roleName(participant.role) },
        });
        socket.to(room.roomCode).emit("user_joined", participants.find((item) => item.userId === decoded.userId));
        await broadcastState(room);
        if (canManageJoinRequests(room, socket, socket.role)) {
          socket.emit("join_requests_updated", { requests: await pendingRequestsFor(room) });
        }
        acknowledge?.({ ok: true });
      } catch (error) {
        const message = error.message === "Room not found" || error.message === "This room is closed" || error.message.startsWith("You are")
          ? error.message
          : "Invalid or expired authentication token";
        permissionError(socket, message);
        acknowledge?.({ ok: false, message });
      }
    });

    socket.on("approve_join_request", async ({ userId }) => {
      const { room, role } = await authorizedRoom(socket);
      if (!room || !canManageJoinRequests(room, socket, role)) {
        return permissionError(socket, "You cannot manage join requests", "JOIN_REQUEST_FORBIDDEN");
      }
      const request = room.joinRequests.find((item) => item.user.toString() === userId);
      if (!request) return permissionError(socket, "Join request not found", "JOIN_REQUEST_NOT_FOUND");

      room.joinRequests = room.joinRequests.filter((item) => item.user.toString() !== userId);
      if (!room.participants.some((item) => item.user.toString() === userId)) {
        room.participants.push({ user: userId, role: "participant" });
      }
      await room.save();

      const participant = room.participants.find((item) => item.user.toString() === userId);
      const pendingSocketId = pendingSockets.get(pendingKey(room.roomCode, userId));
      const pendingSocket = pendingSocketId ? io.sockets.sockets.get(pendingSocketId) : null;
      pendingSockets.delete(pendingKey(room.roomCode, userId));
      if (pendingSocket && participant) {
        pendingSocket.join(room.roomCode);
        pendingSocket.roomId = room.roomCode;
        pendingSocket.userId = userId;
        pendingSocket.role = participant.role;
        pendingSocket.pendingRoomId = null;
        roomRegistry.register({ roomId: room.roomCode, userId, socketId: pendingSocket.id, role: participant.role });
        await emitSyncState(pendingSocket, room, participant);
        pendingSocket.emit("join_request_approved", { roomId: room.roomCode });
        pendingSocket.to(room.roomCode).emit("participant_joined", {
          userId,
          username: pendingSocket.username,
          role: roleName(participant.role),
        });
      }
      await broadcastState(room);
      await notifyJoinManagers(room);
    });

    socket.on("reject_join_request", async ({ userId }) => {
      const { room, role } = await authorizedRoom(socket);
      if (!room || !canManageJoinRequests(room, socket, role)) {
        return permissionError(socket, "You cannot manage join requests", "JOIN_REQUEST_FORBIDDEN");
      }
      const request = room.joinRequests.find((item) => item.user.toString() === userId);
      if (!request) return permissionError(socket, "Join request not found", "JOIN_REQUEST_NOT_FOUND");
      room.joinRequests = room.joinRequests.filter((item) => item.user.toString() !== userId);
      await room.save();

      const pendingSocketId = pendingSockets.get(pendingKey(room.roomCode, userId));
      const pendingSocket = pendingSocketId ? io.sockets.sockets.get(pendingSocketId) : null;
      pendingSockets.delete(pendingKey(room.roomCode, userId));
      pendingSocket?.emit("join_request_rejected", { roomId: room.roomCode, message: "Your request to join was rejected." });
      await notifyJoinManagers(room);
    });

    socket.on("play", async ({ time }) => {
      const { room, role } = await authorizedRoom(socket);
      if (!room || !canControl(role)) return permissionError(socket, "You do not have permission to control playback", "PLAYBACK_FORBIDDEN");
      const nextTime = time === undefined ? room.currentTime : Number(time);
      if (!Number.isFinite(nextTime) || nextTime < 0) return permissionError(socket, "Invalid playback time", "INVALID_PAYLOAD");
      room.playState = "playing";
      room.currentTime = nextTime;
      await room.save();
      io.to(room.roomCode).emit("play", { time: room.currentTime });
    });

    socket.on("pause", async ({ time }) => {
      const { room, role } = await authorizedRoom(socket);
      if (!room || !canControl(role)) return permissionError(socket, "You do not have permission to control playback", "PLAYBACK_FORBIDDEN");
      const nextTime = time === undefined ? room.currentTime : Number(time);
      if (!Number.isFinite(nextTime) || nextTime < 0) return permissionError(socket, "Invalid playback time", "INVALID_PAYLOAD");
      room.playState = "paused";
      room.currentTime = nextTime;
      await room.save();
      io.to(room.roomCode).emit("pause", { time: room.currentTime });
    });

    socket.on("seek", async ({ time }) => {
      const { room, role } = await authorizedRoom(socket);
      if (!room || !canControl(role)) return permissionError(socket, "You do not have permission to control playback", "PLAYBACK_FORBIDDEN");
      const nextTime = Number(time);
      if (!Number.isFinite(nextTime) || nextTime < 0) return permissionError(socket, "Invalid seek time", "INVALID_PAYLOAD");
      room.currentTime = nextTime;
      await room.save();
      io.to(room.roomCode).emit("seek", { time: room.currentTime });
    });

    socket.on("change_video", async ({ url, videoId: requestedVideoId }) => {
      const { room, role } = await authorizedRoom(socket);
      if (!room || !canControl(role)) return permissionError(socket, "You do not have permission to control playback", "PLAYBACK_FORBIDDEN");
      const value = String(requestedVideoId || url || "").trim();
      const videoId = value.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/)?.[1] || (/^[\w-]{11}$/.test(value) ? value : null);
      if (!videoId) return permissionError(socket, "A valid YouTube video is required", "INVALID_PAYLOAD");
      room.videoId = videoId;
      room.currentTime = 0;
      room.playState = "paused";
      await room.save();
      io.to(room.roomCode).emit("video_changed", {
        videoId,
        time: room.currentTime,
        isPlaying: room.playState === "playing",
      });
    });

    socket.on("assign_role", async ({ targetUserId, role }) => {
      const { room, role: currentRole } = await authorizedRoom(socket);
      if (!room || !isHost(currentRole) || room.host.toString() !== socket.userId) return permissionError(socket, "Only the Host can assign roles", "HOST_ONLY");
      const nextRole = String(role || "").toLowerCase();
      if (!["moderator", "participant"].includes(nextRole)) return permissionError(socket, "Invalid role", "INVALID_PAYLOAD");
      const target = room?.participants.find((participant) => participant.user.toString() === targetUserId);
      if (!target || target.user.toString() === socket.userId) return permissionError(socket, "Participant not found", "PARTICIPANT_NOT_FOUND");
      target.role = nextRole;
      await room.save();
      const targetEntry = roomRegistry.get(room.roomCode, targetUserId);
      const targetSocket = targetEntry ? io.sockets.sockets.get(targetEntry.socketId) : null;
      roomRegistry.updateRole(room.roomCode, targetUserId, target.role);
      if (targetSocket) targetSocket.role = target.role;
      if (targetEntry) io.to(targetEntry.socketId).emit("role_assigned", { userId: targetUserId, role: roleName(target.role) });
      await broadcastState(room);
    });

    socket.on("remove_participant", async ({ targetUserId }) => {
      const { room, role: currentRole } = await authorizedRoom(socket);
      if (!room || !isHost(currentRole) || room.host.toString() !== socket.userId) return permissionError(socket, "Only the Host can remove participants", "HOST_ONLY");
      const target = room.participants.find((participant) => participant.user.toString() === targetUserId);
      if (!target || targetUserId === socket.userId) return permissionError(socket, "Participant not found", "PARTICIPANT_NOT_FOUND");
      room.participants = room.participants.filter((participant) => participant.user.toString() !== targetUserId);
      await room.save();
      const targetEntry = roomRegistry.get(room.roomCode, targetUserId);
      const targetSocketId = targetEntry?.socketId;
      const targetSocket = targetEntry ? io.sockets.sockets.get(targetEntry.socketId) : null;
      const targetUsername = targetSocket?.username || "Participant";
      if (targetSocketId) {
        io.to(targetSocketId).emit("participant_removed", { userId: targetUserId, you: true });
        roomRegistry.unregister(room.roomCode, targetUserId, targetSocketId);
        targetSocket?.leave(room.roomCode);
        if (targetSocket) {
          targetSocket.roomId = null;
          targetSocket.userId = null;
          targetSocket.username = null;
          targetSocket.role = null;
        }
      }
      socket.to(room.roomCode).emit("user_left", { userId: targetUserId, username: targetUsername });
      await broadcastState(room);
    });

    socket.on("close_room", async () => {
      const { room, role: currentRole } = await authorizedRoom(socket);
      if (!room || !isHost(currentRole) || room.host.toString() !== socket.userId) return permissionError(socket, "Only the Host can close the room", "HOST_ONLY");
      const pendingTimer = hostGraceTimers.get(room.roomCode);
      if (pendingTimer) clearTimeout(pendingTimer);
      hostGraceTimers.delete(room.roomCode);
      room.isLive = false;
      room.closedAt = new Date();
      await room.save();
      io.to(room.roomCode).emit("room_closed", { roomId: room.roomCode, reason: "The Host closed this room" });
      broadcastLiveUpdate(room);
    });

    socket.on("transfer_host", async ({ targetUserId }) => {
      const { room, role: currentRole } = await authorizedRoom(socket);
      if (!room || !isHost(currentRole) || room.host.toString() !== socket.userId) return permissionError(socket, "Only the Host can transfer ownership", "HOST_ONLY");
      const target = room?.participants.find((participant) => participant.user.toString() === targetUserId);
      const currentHost = room?.participants.find((participant) => participant.user.toString() === socket.userId);
      if (!target || !currentHost || targetUserId === socket.userId) return permissionError(socket, "Participant not found", "PARTICIPANT_NOT_FOUND");
      currentHost.role = "moderator";
      target.role = "host";
      room.host = target.user;
      await room.save();
      const targetEntry = roomRegistry.get(room.roomCode, targetUserId);
      socket.role = "moderator";
      roomRegistry.updateRole(room.roomCode, socket.userId, "moderator");
      roomRegistry.updateRole(room.roomCode, targetUserId, "host");
      const targetSocket = targetEntry ? io.sockets.sockets.get(targetEntry.socketId) : null;
      if (targetSocket) targetSocket.role = "host";
      if (targetEntry) io.to(targetEntry.socketId).emit("host_transferred", { userId: targetUserId });
      await broadcastState(room);
    });

    socket.on("send_message", ({ text }) => {
      if (!socket.roomId || !String(text || "").trim()) return;
      io.to(socket.roomId).emit("new_message", {
        messageId: `${Date.now()}_${socket.id}`,
        userId: socket.userId,
        username: socket.username,
        text: String(text).trim().slice(0, 500),
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("send_reaction", ({ emoji }) => {
      if (!socket.roomId) return;
      io.to(socket.roomId).emit("new_reaction", { emoji, username: socket.username });
    });

    socket.on("leave_room", async () => {
      if (socket.pendingRoomId && socket.pendingUserId) {
        pendingSockets.delete(pendingKey(socket.pendingRoomId, socket.pendingUserId));
        socket.pendingRoomId = null;
        socket.pendingUserId = null;
      }
      if (!socket.roomId) return;
      const leavingRoomId = socket.roomId;
      const leavingRole = socket.role;
      roomRegistry.unregister(socket.roomId, socket.userId, socket.id);
      socket.to(socket.roomId).emit("user_left", { userId: socket.userId, username: socket.username });
      socket.leave(socket.roomId);
      socket.roomId = null;
      socket.userId = null;
      socket.username = null;
      socket.role = null;
      if ((leavingRole === "host" && !hasActiveModerator(leavingRoomId)) || (leavingRole === "moderator" && !hasActiveHost(leavingRoomId))) {
        scheduleHostGrace(leavingRoomId);
      }
      await broadcastRoomState(leavingRoomId);
    });

    socket.on("disconnect", async () => {
      if (socket.pendingRoomId && socket.pendingUserId) {
        pendingSockets.delete(pendingKey(socket.pendingRoomId, socket.pendingUserId));
      }
      if (socket.roomId) {
        const leavingRoomId = socket.roomId;
        const leavingRole = socket.role;
        roomRegistry.unregister(socket.roomId, socket.userId, socket.id);
        io.to(socket.roomId).emit("user_left", { userId: socket.userId, username: socket.username });
        if ((leavingRole === "host" && !hasActiveModerator(leavingRoomId)) || (leavingRole === "moderator" && !hasActiveHost(leavingRoomId))) {
          scheduleHostGrace(leavingRoomId);
        }
        await broadcastRoomState(leavingRoomId);
      }
      console.log("Socket disconnected:", socket.id);
    });
  });
};

export default socketHandler;
