import { Router } from "express";
import * as Auction from "../controllers/auction.controller";
import { signup, signin, refreshTokenHandler } from '../controllers/auth.controller.js';
import { verifyAccessToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/auth/signup', signup);
router.post('/auth/signin', signin);
router.post('/auth/refresh', refreshTokenHandler);

router.post('/rooms',Auction.CreateRoom);

router.get('/rooms/:roomId',verifyAccessToken,Auction.getRoomDetails);
router.post('/rooms/join/:roomId/',Auction.joinRoom);
router.post('/rooms/:roomId/items',Auction.addItemToRoom);

export default router;
