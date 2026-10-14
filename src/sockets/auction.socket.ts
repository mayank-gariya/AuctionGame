import { Server, Socket } from "socket.io";
import { Room } from "../models/room.model"; 

export const configureSockets = (io: Server) => {
    io.on("connection", (socket: Socket) => {
        console.log(`🔌 User connected: ${socket.id}`);
        
        socket.on("join-auction", async (data: { roomId: string; userId: string }) => {
            const { roomId, userId } = data;

            socket.data.roomId = roomId;
            socket.data.userId = userId;

            socket.join(roomId);
            console.log(`👤 User ${userId} (Socket: ${socket.id}) joined socket room: ${roomId}`);

            await Room.findByIdAndUpdate(roomId, {
                $addToSet: { participants: userId }
            });

            const updatedRoom = await Room.findById(roomId);

            socket.to(roomId).emit("user_joined_broadcast", {
                userId,
                participants: updatedRoom?.participants,
                message: `User ${userId} has taken a seat in auction`
            });
        });

        socket.on("place-bid", (data: { roomId: string; userId: string; bidAmount: number; itemId: string }) => {
            const { roomId, userId, bidAmount, itemId } = data;

            console.log(`💰 Bid placed in room ${roomId}: $${bidAmount} by ${userId} for item ${itemId}`);

            io.to(roomId).emit("bid_update", {
                userId,
                bidAmount,
                itemId,
                timestamp: new Date(),
            });
        });
        
        socket.on("item_status_update", (data: { roomId: string; itemId: string; status: string }) => {
            const { roomId, itemId, status } = data;
            
            io.to(roomId).emit("queue_updated", {
                itemId,
                status,
                message: `Item ${itemId} updated to: ${status}`,
            });
        });

        socket.on("disconnect", async () => {
            console.log(`❌ User disconnected: ${socket.id}`);

            if (socket.data.roomId && socket.data.userId) {
                const { roomId, userId } = socket.data;

                await Room.findByIdAndUpdate(roomId, {
                    $pull: { participants: userId }
                });

                const updatedRoom = await Room.findById(roomId);

                io.to(roomId).emit("user_left_broadcast", {
                    userId,
                    participants: updatedRoom?.participants,
                    message: `User ${userId} has left the auction`
                });

                console.log(`🧹 Cleaned up user ${userId} from room ${roomId}`);
            } else {
                console.log(`ℹ️ Socket ${socket.id} disconnected without an active room session.`);
            }
        });
    });
};