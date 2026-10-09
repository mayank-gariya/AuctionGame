import { Router } from "express";
import * as Auction from "../controllers/auction.controller";

const router = Router();

router.post('/rooms',Auction.CreateRoom);
router.get('/rooms/:roomId',Auction.getRoomDetails);
router.post('/rooms/join/:roomId/',Auction.joinRoom);
router.post('/rooms/:roomId/items',Auction.addItemToRoom);

export default router;
