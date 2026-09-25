import jwt from "jsonwebtoken";
import Room from "../models/Room.js";
import User from "../models/User.js";

const roleName = (role) => role.toUpperCase();
const canControl = (role) => role === "host" || role === "moderator";
const HOST_GRACE_MS = 15000;

const socketHandler = (io) => {
  const connectedUsers = new Map();
  const hostGraceTimers = new Map();

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
      online: connectedUsers.has(`${room.roomCode}:${participant.user}`),
      joinedAt: room.createdAt,
    }));
  };

  const permissionError = (socket, message) => socket.emit("permission_error", { message });
  const broadcastState = async (room) => io.to(room.roomCode).emit("room_state_updated", { participants: await participantsFor(room) });
  const hasActiveModerator = (roomCode) => [...io.sockets.sockets.values()].some(
    (roomSocket) => roomSocket.roomId === roomCode && roomSocket.role === "moderator"
  );
  const hasActiveHost = (roomCode) => [...io.sockets.sockets.values()].some(
    (roomSocket) => roomSocket.roomId === roomCode && roomSocket.role === "host"
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
    room.closedAt = new Date();
    await room.save();
    io.to(roomCode).emit("room_closed", { roomId: roomCode, reason: "Host left the room" });
    broadcastLiveUpdate(room);
  };
  const scheduleHostGrace = (roomCode) => {
    if (hostGraceTimers.has(roomCode)) return;
    const timer = setTimeout(() => markRoomOffline(roomCode), HOST_GRACE_MS);
    hostGraceTimers.set(roomCode, timer);
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
        if (!participant) throw new Error("You are not a participant of this room");

        socket.join(room.roomCode);
        socket.roomId = room.roomCode;
        socket.userId = decoded.userId;
        socket.username = username || "Guest";
        socket.role = participant.role;
        connectedUsers.set(`${room.roomCode}:${decoded.userId}`, socket.id);

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

        const participants = await participantsFor(room);
        socket.emit("sync_state", {
          room: {
            roomId: room.roomCode,
            name: room.name,
            videoId: room.videoId || null,
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
        acknowledge?.({ ok: true });
      } catch (error) {
        const message = error.message === "Room not found" || error.message === "This room is closed" || error.message.startsWith("You are")
          ? error.message
          : "Invalid or expired authentication token";
        permissionError(socket, message);
        acknowledge?.({ ok: false, message });
      }
    });

    socket.on("play", async ({ time }) => {
      if (!socket.roomId || !canControl(socket.role)) return permissionError(socket, "Playback control is not allowed");
      const room = await Room.findOneAndUpdate({ roomCode: socket.roomId }, { playState: "playing", currentTime: Number(time) || 0 }, { new: true });
      if (room) io.to(socket.roomId).emit("play", { time: room.currentTime });
    });

    socket.on("pause", async ({ time }) => {
      if (!socket.roomId || !canControl(socket.role)) return permissionError(socket, "Playback control is not allowed");
      const room = await Room.findOneAndUpdate({ roomCode: socket.roomId }, { playState: "paused", currentTime: Number(time) || 0 }, { new: true });
      if (room) io.to(socket.roomId).emit("pause", { time: room.currentTime });
    });

    socket.on("seek", async ({ time }) => {
      if (!socket.roomId || !canControl(socket.role)) return permissionError(socket, "Playback control is not allowed");
      const room = await Room.findOneAndUpdate({ roomCode: socket.roomId }, { currentTime: Number(time) || 0 }, { new: true });
      if (room) io.to(socket.roomId).emit("seek", { time: room.currentTime });
    });

    socket.on("change_video", async ({ url }) => {
      if (!socket.roomId || !canControl(socket.role)) return permissionError(socket, "Changing video is not allowed");
      const value = String(url || "");
      const videoId = value.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)?.[1] || value;
      const room = await Room.findOneAndUpdate({ roomCode: socket.roomId }, { videoId, currentTime: 0, playState: "playing" }, { new: true });
      if (room) io.to(socket.roomId).emit("video_changed", { videoId });
    });

    socket.on("assign_role", async ({ targetUserId, role }) => {
      if (!socket.roomId || socket.role !== "host") return permissionError(socket, "Only the Host can assign roles");
      const nextRole = String(role || "").toLowerCase();
      if (!["moderator", "participant"].includes(nextRole)) return permissionError(socket, "Invalid role");
      const room = await Room.findOne({ roomCode: socket.roomId });
      const target = room?.participants.find((participant) => participant.user.toString() === targetUserId);
      if (!room || !target || target.user.toString() === socket.userId) return permissionError(socket, "Participant not found");
      target.role = nextRole;
      await room.save();
      const targetSocketId = connectedUsers.get(`${room.roomCode}:${targetUserId}`);
      const targetSocket = targetSocketId ? io.sockets.sockets.get(targetSocketId) : null;
      if (targetSocket) targetSocket.role = target.role;
      if (targetSocketId) io.to(targetSocketId).emit("role_assigned", { userId: targetUserId, role: roleName(target.role) });
      await broadcastState(room);
    });

    socket.on("remove_participant", async ({ targetUserId }) => {
      if (!socket.roomId || socket.role !== "host") return permissionError(socket, "Only the Host can remove participants");
      const room = await Room.findOne({ roomCode: socket.roomId });
      if (!room) return permissionError(socket, "Room not found");
      const target = room.participants.find((participant) => participant.user.toString() === targetUserId);
      if (!target || targetUserId === socket.userId) return permissionError(socket, "Participant not found");
      room.participants = room.participants.filter((participant) => participant.user.toString() !== targetUserId);
      await room.save();
      const targetSocketId = connectedUsers.get(`${room.roomCode}:${targetUserId}`);
      if (targetSocketId) {
        io.to(targetSocketId).emit("participant_removed", { userId: targetUserId, you: true });
        io.sockets.sockets.get(targetSocketId)?.leave(room.roomCode);
      }
      await broadcastState(room);
    });

    socket.on("close_room", async () => {
      if (!socket.roomId || socket.role !== "host") return permissionError(socket, "Only the Host can close the room");
      const room = await Room.findOne({ roomCode: socket.roomId });
      if (!room) return permissionError(socket, "Room not found");
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
      if (!socket.roomId || socket.role !== "host") return permissionError(socket, "Only the Host can transfer ownership");
      const room = await Room.findOne({ roomCode: socket.roomId });
      const target = room?.participants.find((participant) => participant.user.toString() === targetUserId);
      const currentHost = room?.participants.find((participant) => participant.user.toString() === socket.userId);
      if (!room || !target || !currentHost || targetUserId === socket.userId) return permissionError(socket, "Participant not found");
      currentHost.role = "moderator";
      target.role = "host";
      room.host = target.user;
      await room.save();
      const targetSocketId = connectedUsers.get(`${room.roomCode}:${targetUserId}`);
      socket.role = "moderator";
      const targetSocket = targetSocketId ? io.sockets.sockets.get(targetSocketId) : null;
      if (targetSocket) targetSocket.role = "host";
      if (targetSocketId) io.to(targetSocketId).emit("host_transferred", { userId: targetUserId });
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

    socket.on("leave_room", () => {
      if (!socket.roomId) return;
      const leavingRoomId = socket.roomId;
      const leavingRole = socket.role;
      connectedUsers.delete(`${socket.roomId}:${socket.userId}`);
      socket.to(socket.roomId).emit("user_left", { userId: socket.userId, username: socket.username });
      socket.leave(socket.roomId);
      socket.roomId = null;
      socket.userId = null;
      socket.username = null;
      socket.role = null;
      if ((leavingRole === "host" && !hasActiveModerator(leavingRoomId)) || (leavingRole === "moderator" && !hasActiveHost(leavingRoomId))) {
        scheduleHostGrace(leavingRoomId);
      }
    });

    socket.on("disconnect", () => {
      if (socket.roomId) {
        const leavingRoomId = socket.roomId;
        const leavingRole = socket.role;
        connectedUsers.delete(`${socket.roomId}:${socket.userId}`);
        socket.to(socket.roomId).emit("user_left", { userId: socket.userId, username: socket.username });
        if ((leavingRole === "host" && !hasActiveModerator(leavingRoomId)) || (leavingRole === "moderator" && !hasActiveHost(leavingRoomId))) {
          scheduleHostGrace(leavingRoomId);
        }
      }
      console.log("Socket disconnected:", socket.id);
    });
  });
};

export default socketHandler;
