import { Schema, model, Document } from 'mongoose';

export interface IAuctionItem {
  id: string;
  title: string;
  description: string;
  startingPrice: number;
  sellerId: string;
  status: 'pending' | 'active' | 'sold' | 'unsold';
}

export interface IParticipant {
  userId: string;
  username: string;
}

export interface IRoom extends Document {
  name: string;
  hostId: string;
  maxSeats: number;
  participants: IParticipant[];
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

const participantSchema = new Schema<IParticipant>(
  {
    userId: { type: String, required: true },
    username: { type: String, required: true }
  },
  { _id: false }
);

const roomSchema = new Schema<IRoom>({
  name: { type: String, required: true },
  hostId: { type: String, required: true },
  maxSeats: { type: Number, default: 10, max: 10 },

  participants: {
    type: [participantSchema],
    default: []
  },

  itemQueue: [auctionItemSchema],

  status: {
    type: String,
    enum: ['waiting', 'live', 'ended'],
    default: 'waiting'
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Room = model<IRoom>('Room', roomSchema);