import { Server, Socket } from "socket.io";
import { Room } from "../models/room.model";

export const configureSockets = (io: Server) => {
    io.on("connection", (socket: Socket) => {
        console.log(`🔌 User connected: ${socket.id}`);
        socket.on(
            "join-auction",
            async (data: {
                roomId: string;
                userId: string;
                username: string;
            }) => {
                try {
                    const { roomId, userId, username } = data;

                    socket.data.roomId = roomId;
                    socket.data.userId = userId;
                    socket.data.username = username;

                    socket.join(roomId);

                    console.log(
                        `👤 User ${username} (${userId}) joined socket room: ${roomId}`
                    );

                    const updatedRoom = await Room.findById(roomId);

                    socket.to(roomId).emit("user_joined_broadcast", {
                        userId,
                        username,
                        participants: updatedRoom?.participants,
                        message: `${username} has taken a seat in auction`
                    });

                } catch (error) {
                    console.error("❌ Error joining auction:", error);
                }
            }
        );

        socket.on(
            "place-bid",
            (data: {
                roomId: string;
                userId: string;
                bidAmount: number;
                itemId: string;
            }) => {
                const { roomId, userId, bidAmount, itemId } = data;
                const username = socket.data.username;
                
                console.log(
                    `💰 Bid placed in room ${roomId}: $${bidAmount} by ${userId} for item ${itemId}`
                );

                io.to(roomId).emit("bid_update", {
                    userId,
                    bidAmount,
                    itemId,
                    username,
                    timestamp: new Date(),
                });
            }
        );

        socket.on(
            "item_status_update",
            (data: {
                roomId: string;
                itemId: string;
                status: string;
            }) => {
                const { roomId, itemId, status } = data;

                io.to(roomId).emit("queue_updated", {
                    itemId,
                    status,
                    message: `Item ${itemId} updated to: ${status}`,
                });
            }
        );

        socket.on("disconnect", async () => {
            console.log(`❌ User disconnected: ${socket.id}`);

            if (socket.data.roomId && socket.data.userId) {
                try {
                    const { roomId, userId } = socket.data;

                    await Room.findByIdAndUpdate(roomId, {
                        $pull: {
                            participants: {
                                userId
                            }
                        }
                    });

                    const updatedRoom = await Room.findById(roomId);

                    io.to(roomId).emit("user_left_broadcast", {
                        userId,
                        participants: updatedRoom?.participants,
                        message: `User ${userId} has left the auction`
                    });

                    console.log(
                        `🧹 Cleaned up user ${userId} from room ${roomId}`
                    );

                } catch (error) {
                    console.error(
                        "❌ Error cleaning up disconnected user:",
                        error
                    );
                }
            } else {
                console.log(
                    `ℹ️ Socket ${socket.id} disconnected without an active room session.`
                );
            }
        });
    });
};