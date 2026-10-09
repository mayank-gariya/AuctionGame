import { Server , Socket } from "socket.io";

export const configureSockets = (io:Server)=>{
    io.on("connection",(socket:Socket)=>{
        console.log(`🔌 User connected: ${socket.id}`);
        
        socket.on('join-auction',(data:{ roomId:string; userId:string})=>{
            const { roomId , userId } = data;

            socket.join(roomId); // socket room 
            console.log(`👤 User ${userId} (Socket: ${socket.id}) joined socket room: ${roomId}`);

            socket.to(roomId).emit('user_joined_broadcast',{
                userId,
                message:`user ${userId} has taken a seat in auction`
            });
        });

        socket.on('place-bid',(data: { roomId: string; userId: string; bidAmount: number; itemId: string })=>{
            const { roomId , userId , bidAmount , itemId} = data;

            console.log(`💰 Bid placed in room ${roomId}: $${bidAmount} by ${userId} for item ${itemId}`);

            io.to(roomId).emit('bid_update', {
                userId,
                bidAmount,
                itemId,
                timestamp: new Date(),
            });
        });
        
        socket.on('item_status_update', (data: { roomId: string; itemId: string; status: string }) => {
            const { roomId, itemId, status } = data;
            
            io.to(roomId).emit('queue_updated', {
                    itemId,
                    status,
                    message: `Item ${itemId} status updated to: ${status}`,
                });
            });

            //Handle Disconnection
            socket.on('disconnect', () => {
            console.log(`❌ User disconnected: ${socket.id}`);
        });
    });
}