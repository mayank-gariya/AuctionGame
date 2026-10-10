import { Request ,Response } from "express";
import { AuctionItem ,AuctionRoom } from "../types/auction";
import { Room } from '../models/room.model.js';
import crypto from 'crypto';

import { AuthenticatedRequest } from '../middleware/auth.middleware.js';


const rooms: Map<string , AuctionRoom> = new Map();

export const CreateRoom = async (req:AuthenticatedRequest,res:Response):Promise<void> =>{
    try{
        const { name } = req.body;
        const hostId = req.user?.userId;
        
        if (!name || !hostId){
            res.status(400).json({ error: 'Room name and hostId are required.' });
            return;
        }

        const newRoom = await Room.create({
          name,
          hostId,
          maxSeats:10,
          participants:[hostId],
          itemQueue:[],
          status:'waiting',
          createdAt:new Date(),
        });

        res.status(201).json({ message: 'Auction room created successfully', room: newRoom });
        return;
    }catch(e){
        res.status(500).json({ error: 'Internal server error while creating room.' });
    }
}

export const addItemToRoom = async (req:Request,res:Response):Promise<void> =>{
    try{
        const { roomId } = req.params;
        const { title, description, startingPrice, sellerId } = req.body;

        if (!roomId) {
            res.status(400).json({ error: 'Room ID is required.' });
            return;
        }

        const room = await Room.findById(roomId);
        
        if (!room) {
            res.status(404).json({ error: 'Auction room not found.' });
            return;
        }

        if (room.status !== 'waiting') {
            res.status(400).json({ error: 'Cannot add items once the auction has started.' });
            return;
        }

        const newItem = {
              id: crypto.randomUUID(),
              title,
              description,
              startingPrice: Number(startingPrice),
              sellerId,
              status: 'pending' as const,
        };

        room.itemQueue.push(newItem);
        await room.save();

        res.status(200).json({ message: 'Item added to auction queue', item: newItem, room });
        return;
    }catch(error){
       console.error(error)
       res.status(500).json({ error: 'Failed to add item to queue.' });
       return;
    }
}

export const joinRoom = async (req: Request, res: Response):Promise<void> => {
try {
    const { roomId } = req.params;
    const { userId } = req.body;

    if (!roomId) {
      res.status(400).json({ error: 'Room ID is required in URL params.' });
      return;
    }

    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({ error: 'Auction room not found.' });
      return;
    }
    
    if (room.participants.includes(userId)) {
      res.status(200).json({ message: 'User already in room', room });
      return;
    }

    if (room.participants.length >= room.maxSeats) {
      res.status(403).json({ error: 'Auction room is full! Maximum 10 seats allowed.' });
      return;
    }

    room.participants.push(userId);
    await room.save();

    res.status(200).json({ message: 'Joined room successfully', room });
    return;
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal server error. Try again later!' });
    return;
  }
};

export const getRoomDetails = async (req: Request, res: Response):Promise<void> => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      res.status(400).json({ error: 'Room ID is required.' });
      return;
    }

    const room = await Room.findById(roomId);
    if (!room) {
      res.status(404).json({ error: 'Auction room not found.' });
      return;
    }

    res.status(200).json({ room });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch room details.' });
    return;
  }
};