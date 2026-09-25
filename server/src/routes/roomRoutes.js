import express from "express";

import {
  createRoom,
  joinRoom,
  getRoom,
  listRooms,
  listLiveRooms,
  listMyRooms,
  closeRoom
} from "../controllers/roomController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, createRoom);
router.get("/", authMiddleware, listRooms);
router.get("/live", authMiddleware, listLiveRooms);
router.get("/my", authMiddleware, listMyRooms);

router.post("/join", authMiddleware, joinRoom);
router.patch("/:roomCode/close", authMiddleware, closeRoom);
router.get("/:roomCode", authMiddleware, getRoom);

export default router;