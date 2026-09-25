import express from "express";

import {
  createRoom,
  joinRoom,
  getRoom,
  listRooms,
  listLiveRooms
} from "../controllers/roomController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, createRoom);
router.get("/", authMiddleware, listRooms);
router.get("/live", authMiddleware, listLiveRooms);

router.post("/join", authMiddleware, joinRoom);
router.get("/:roomCode", authMiddleware, getRoom);

export default router;