import Room from "../models/Room.js";
import { extractYouTubeId } from "../utils/youtube.js";

const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const createRoom = async (req, res) => {
  try {
    const { name, videoId, privacy, visibility } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Room name is required"
      });
    }

    let roomCode;
    let existingRoom;

    do {
      roomCode = generateRoomCode();

      existingRoom = await Room.findOne({
        roomCode
      });
    } while (existingRoom);

    const roomVisibility = visibility === "private" || privacy === "private" ? "private" : "public";
    const normalizedVideoId = videoId ? extractYouTubeId(videoId) : "";
    if (videoId && !normalizedVideoId) {
      return res.status(400).json({
        success: false,
        message: "A valid YouTube video is required",
        code: "INVALID_YOUTUBE_URL"
      });
    }

    const room = await Room.create({
      roomCode,
      name,
      privacy: roomVisibility,
      visibility: roomVisibility,
      host: req.user.userId,
      participants: [
        {
          user: req.user.userId,
          role: "host"
        }
      ],
      videoId: normalizedVideoId,
      playState: "paused",
      currentTime: 0,
      isLive: false,
      closedAt: null
    });

    return res.status(201).json({
      success: true,
      message: "Room created successfully",
      room
    });
  } catch (error) {
    console.error("Create room error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

export const joinRoom = async (req, res) => {
  try {
    const { roomCode } = req.body;

    if (!roomCode) {
      return res.status(400).json({
        success: false,
        message: "Room code is required"
      });
    }

    const room = await Room.findOne({
      roomCode: roomCode.toUpperCase()
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    if (room.closedAt) {
      return res.status(410).json({
        success: false,
        message: "This room is closed"
      });
    }

    const userId = req.user.userId;

    // Check if user is already in the room
    if (room.participants.some((participant) => participant.user.toString() === userId)) {
      return res.status(200).json({
        success: true,
        message: "Already joined this room",
        room
      });
    }

    const isPrivate = room.visibility === "private" || room.privacy === "private";
    if (isPrivate) {
      if (!room.joinRequests.some((request) => request.user.toString() === userId)) {
        room.joinRequests.push({ user: userId });
        await room.save();
      }
      return res.status(202).json({
        success: true,
        pending: true,
        message: "Join request sent. Waiting for approval.",
        room
      });
    }

    const updatedRoom = await Room.findOneAndUpdate(
      {
        _id: room._id,
        closedAt: null,
        participants: { $not: { $elemMatch: { user: userId } } }
      },
      { $push: { participants: { user: userId, role: "participant" } } },
      { new: true }
    );

    if (!updatedRoom) {
      const latestRoom = await Room.findById(room._id);
      if (latestRoom?.closedAt) {
        return res.status(410).json({ success: false, message: "This room is closed" });
      }
      if (latestRoom?.participants.some((participant) => participant.user.toString() === userId)) {
        return res.status(200).json({ success: true, message: "Already joined this room", room: latestRoom });
      }
      return res.status(409).json({ success: false, message: "Could not join room" });
    }

    return res.status(200).json({
      success: true,
      message: "Room joined successfully",
      room: updatedRoom
    });
  } catch (error) {
    console.error("Join room error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
export const getRoom = async (req, res) => {
  try {
    const { roomCode } = req.params;

    const room = await Room.findOne({
      roomCode: roomCode.toUpperCase()
    })
      .select("-joinRequests")
      .populate("host", "name email")
      .populate("participants.user", "name email");

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    return res.status(200).json({
      success: true,
      room
    });
  } catch (error) {
    console.error("Get room error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

export const listRooms = async (req, res) => {
  try {
    const rooms = await Room.find({
      closedAt: null,
      $or: [
        { visibility: "public" },
        { visibility: { $exists: false }, privacy: "public" }
      ]
    }).select("-joinRequests").sort({ updatedAt: -1 }).limit(50);
    return res.status(200).json({ success: true, rooms });
  } catch (error) {
    console.error("List rooms error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const listLiveRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ isLive: true, closedAt: null })
      .select("-joinRequests")
      .populate("host", "name")
      .populate("participants.user", "name")
      .sort({ updatedAt: -1 })
      .limit(50);
    return res.status(200).json({ success: true, rooms });
  } catch (error) {
    console.error("List live rooms error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const listMyRooms = async (req, res) => {
  try {
    const rooms = await Room.find({
      $or: [
        { host: req.user.userId },
        { "participants.user": req.user.userId }
      ]
    })
      .select("-joinRequests")
      .populate("host", "name email")
      .sort({ updatedAt: -1 })
      .limit(100);
    return res.status(200).json({ success: true, rooms });
  } catch (error) {
    console.error("List my rooms error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const closeRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomCode: req.params.roomCode.toUpperCase() });
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }
    if (room.host.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: "Only the Host can close the room" });
    }

    room.isLive = false;
    room.closedAt = new Date();
    await room.save();
    return res.status(200).json({ success: true, room });
  } catch (error) {
    console.error("Close room error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};