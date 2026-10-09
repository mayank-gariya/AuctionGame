export interface AuctionItem {
    id : string;
    title : string;
    description:string;
    startingPrice: number;
    sellerId: string;
    status: 'pending' | 'active' | 'sold' | 'unsold';
}

export interface AuctionRoom {
    id : string;
    name:string;
    hostId:string;
    maxSeats: number; // Strictly 10
    participants: string[]; // Array of user IDs or socket IDs currently seated
    itemQueue: AuctionItem[];
    status: 'waiting' | 'live' | 'ended';
    createdAt: Date;
}
