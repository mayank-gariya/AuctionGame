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
    maxSeats: number;
    participants: {
        userId: string;
        username: string;
    }[];
    itemQueue: AuctionItem[];
    status: 'waiting' | 'live' | 'ended';
    createdAt: Date;
}
