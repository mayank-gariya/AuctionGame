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

                    console.log("🔐 Socket authentication data:", {
                        socketId: socket.id,
                        roomId: socket.data.roomId,
                        userId: socket.data.userId,
                        username: socket.data.username
                    });

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
            async (data: {
                roomId: string;
                itemId: string;
                status: "active" | "pending" | "unsold";
            }) => {
                try {
                    const { roomId, itemId, status } = data;

                    console.log("🎛️ Status update received:", {
                        roomId,
                        itemId,
                        status,
                        userId: socket.data.userId
                    });

                    const room = await Room.findById(roomId);

                    if (!room) {
                        socket.emit("status_update_rejected", {
                            message: "Auction room not found."
                        });
                        return;
                    }

                    // Only host can control auction
                    console.log("🔎 Host check:", {
                        roomHostId: String(room.hostId),
                        socketUserId: String(socket.data.userId),
                        isHost:
                            String(room.hostId) === String(socket.data.userId)
                    });

                    if (String(room.hostId) !== String(socket.data.userId)) {
                        socket.emit("status_update_rejected", {
                            message: "Only the host can control the auction."
                        });
                        return;
                    }

                    // Find item using MongoDB subdocument _id
                    const item = room.itemQueue.find(
                        (auctionItem) =>
                            String(auctionItem.id) === String(itemId)
                    );

                    if (!item) {
                        console.log("❌ Item not found:", itemId);

                        socket.emit("status_update_rejected", {
                            message: "Auction item not found."
                        });

                        return;
                    }

                    // Update item status
                    item.status = status;

                    // If bidding starts, room becomes live
                    if (status === "active") {
                        room.status = "live";
                    }

                    // If item is paused/closed, room can remain live
                    await room.save();

                    console.log(
                        `🎛️ Host changed item "${item.title}" status to ${status}`
                    );

                    // Tell every user in the room
                    io.to(roomId).emit("queue_updated", {
                        itemId,
                        status,
                        message: `Item ${item.title} is now ${status}.`
                    });

                } catch (error) {
                    console.error(
                        "❌ Error updating item status:",
                        error
                    );

                    socket.emit("status_update_rejected", {
                        message: "Failed to update item status."
                    });
                }
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