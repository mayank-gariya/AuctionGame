import { Schema, model, Document } from 'mongoose';

export interface IAuctionItem {
  id: string;
  title: string;
  description: string;
  startingPrice: number;
  sellerId: string;
  status: 'pending' | 'active' | 'sold' | 'unsold';
}

export interface IRoom extends Document {
  name: string;
  hostId: string;
  maxSeats: number; // Strictly 10
  participants: string[]; // Array of user IDs
  itemQueue: IAuctionItem[];
  status: 'waiting' | 'live' | 'ended';
  createdAt: Date;
}

const auctionItemSchema = new Schema<IAuctionItem>({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  startingPrice: { type: Number, required: true },
  sellerId: { type: String, required: true },
  status: { type: String, enum: ['pending', 'active', 'sold', 'unsold'], default: 'pending' }
});

const roomSchema = new Schema<IRoom>({
  name: { type: String, required: true },
  hostId: { type: String, required: true },
  maxSeats: { type: Number, default: 10, max: 10 }, // Enforcing the 10-seat limit at schema level
  participants: { type: [String], default: [] },
  itemQueue: [auctionItemSchema],
  status: { type: String, enum: ['waiting', 'live', 'ended'], default: 'waiting' },
  createdAt: { type: Date, default: Date.now }
});

export const Room = model<IRoom>('Room', roomSchema);