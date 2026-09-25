import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    role: {
      type: String,
      enum: ["host", "moderator", "participant"],
      default: "participant"
    }
  },
  {
    _id: false
  }
);

const joinRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    roomCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    privacy: {
      type: String,
      enum: ["public", "private"],
      default: "private"
    },

    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public"
    },

    isLive: {
      type: Boolean,
      default: false
    },

    closedAt: {
      type: Date,
      default: null
    },

    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    participants: {
      type: [participantSchema],
      default: []
    },

    joinRequests: {
      type: [joinRequestSchema],
      default: []
    },

    videoId: {
      type: String,
      default: ""
    },

    playState: {
      type: String,
      enum: ["playing", "paused"],
      default: "paused"
    },

    currentTime: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

const Room = mongoose.model("Room", roomSchema);

export default Room;