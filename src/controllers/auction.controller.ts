import { Request ,Response } from "express";
import { AuctionItem ,AuctionRoom } from "../types/auction";

const rooms: Map<string , AuctionRoom> = new Map();

export const CreateRoom = (req:Request,res:Response):void =>{
    try{
        const { name , hostId } = req.body;
        
        if (!name || !hostId){
            res.status(400).json({ error: 'Room name and hostId are required.' });
            return;
        }

        const roomId = Math.random().toString(36).substring(2, 9);
        const newRoom: AuctionRoom = {
            id:roomId,
            name,
            hostId,
            maxSeats:10,
            participants:[hostId],
            itemQueue:[],
            status:'waiting',
            createdAt:new Date(),
        }

        rooms.set(roomId,newRoom);
        res.status(201).json({ message: 'Auction room created successfully', room: newRoom });
    }catch(e){
        res.status(500).json({ error: 'Internal server error while creating room.' });
    }
}

export const addItemToRoom = (req:Request,res:Response):void=>{
    try{
        const { roomId } = req.params;

        if (!roomId) {
            res.status(400).json({ error: 'Room ID is required.' });
            return;
        }

        const { title , description ,startingPrice ,sellerId } = req.body;
        const room = rooms.get(roomId as string);
        
        if (!room) {
            res.status(404).json({ error: 'Auction room not found.' });
            return;
        }

        if (room.status !== 'waiting') {
            res.status(400).json({ error: 'Cannot add items once the auction has started.' });
            return;
        }

        const newItem:AuctionItem = {
            id:Math.random().toString(36).substring(2,9),
            title,
            description,
            startingPrice:Number(startingPrice),
            sellerId,
            status:"pending",
        }

        room.itemQueue.push(newItem);
        res.status(200).json({ message: 'Item added to auction queue', item: newItem, room });

    }catch(e){
        res.status(500).json({ error: 'Failed to add item to queue.' });
    }
}

export const joinRoom = (req: Request, res: Response): void => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    console.log(userId);
    console.log(roomId);

    if (!roomId) {
      res.status(400).json({ error: 'Room ID is required in URL params.' });
      return;
    }

    const room = rooms.get(roomId as string);
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
    res.status(200).json({ message: 'Joined room successfully', room });
    return;
  } catch (e) {
    res.status(500).json({ error: 'Internal server error. Try again later!' });
    return;
  }
};

export const getRoomDetails = (req: Request, res: Response): void => {
  const { roomId } = req.params;
  const room = rooms.get(roomId as string);

  if (!room) {
    res.status(404).json({ error: 'Auction room not found.' });
    return;
  }

  res.status(200).json({ room });
};