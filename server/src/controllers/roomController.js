import Room from "../models/Room.js";

const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const createRoom = async (req, res) => {
  try {
    const { name, videoId, privacy } = req.body;

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

    const room = await Room.create({
      roomCode,
      name,
      privacy: privacy === "public" ? "public" : "private",
      host: req.user.userId,
      participants: [
        {
          user: req.user.userId,
          role: "host"
        }
      ],
      videoId: videoId || "",
      playState: "paused",
      currentTime: 0
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
    const alreadyJoined = room.participants.some(
      (participant) => participant.user.toString() === userId
    );

    if (alreadyJoined) {
      return res.status(200).json({
        success: true,
        message: "Already joined this room",
        room
      });
    }

    // Add user as participant
    room.participants.push({
      user: userId,
      role: "participant"
    });

    await room.save();

    return res.status(200).json({
      success: true,
      message: "Room joined successfully",
      room
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
    const rooms = await Room.find({}).sort({ updatedAt: -1 }).limit(50);
    return res.status(200).json({ success: true, rooms });
  } catch (error) {
    console.error("List rooms error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const listLiveRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ isLive: true, closedAt: null })
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