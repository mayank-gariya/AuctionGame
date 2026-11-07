
import { Server, Socket } from "socket.io";
import { Room } from "../models/room.model";

// Store active auction timers and their remaining time.
const auctionTimers = new Map<string, NodeJS.Timeout>();
const auctionEndsAt = new Map<string, number>();
const auctionRemaining = new Map<string, number>();

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

                    // Synchronize timer for users joining an active auction
                    if (updatedRoom?.currentItemId) {
                        const currentItem = updatedRoom.itemQueue.find(
                            item =>
                                String(item.id) ===
                                String(updatedRoom.currentItemId)
                        );

                        const endsAt = auctionEndsAt.get(roomId);

                        if (currentItem?.status === "active" && endsAt) {
                            socket.emit("auction_timer_start", {
                                itemId: currentItem.id,
                                endsAt,
                                serverNow: Date.now()
                            });
                        }
                    }

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

        // PLACE BID
        socket.on(
            "place-bid",
            async (data: {
                roomId: string;
                userId: string;
                bidAmount: number;
                itemId: string;
            }) => {
                try {
                    const { roomId, userId, bidAmount, itemId } = data;
                    const username = socket.data.username;

                    // Check room
                    const room = await Room.findById(roomId);

                    if (!room) {
                        socket.emit("bid_rejected", {
                            message: "Auction room not found."
                        });
                        return;
                    }

                    // Check participant membership
                    const participant = room.participants.find(
                        participant =>
                            String(participant.userId) === String(userId)
                    );

                    if (!participant) {
                        socket.emit("bid_rejected", {
                            message: "You are not a participant in this auction."
                        });
                        return;
                    }

                    // Host cannot bid
                    if (String(room.hostId) === String(userId)) {
                        socket.emit("bid_rejected", {
                            message: "Host cannot place bids."
                        });
                        return;
                    }

                    // Find item
                    const item = room.itemQueue.find(
                        auctionItem =>
                            String(auctionItem.id) === String(itemId)
                    );

                    if (!item) {
                        socket.emit("bid_rejected", {
                            message: "Auction item not found."
                        });
                        return;
                    }

                    // Ensure this is the currently selected item
                    if (
                        String(room.currentItemId) !== String(item.id)
                    ) {
                        socket.emit("bid_rejected", {
                            message: "This item is not currently selected."
                        });
                        return;
                    }

                    // Bidding only allowed for active items
                    if (item.status !== "active") {
                        socket.emit("bid_rejected", {
                            message: "Bidding is not open for this item."
                        });
                        return;
                    }

                    // Validate bid amount
                    const currentBid =
                        Number(item.currentBid) ||
                        Number(item.startingPrice) ||
                        0;

                    const newBid = Number(bidAmount);

                    if (
                        !Number.isFinite(newBid) ||
                        newBid <= currentBid
                    ) {
                        socket.emit("bid_rejected", {
                            message: `Bid must be higher than the current bid of $${currentBid}.`
                        });
                        return;
                    }

                    // Save highest bid
                    item.currentBid = newBid;
                    item.highestBidderId = userId;
                    item.highestBidderName = username;

                    await room.save();

                    console.log(
                        `💰 New highest bid in room ${roomId}: $${newBid} by ${username}`
                    );

                    // Broadcast bid to everyone
                    io.to(roomId).emit("bid_update", {
                        userId,
                        username,
                        bidAmount: newBid,
                        itemId,
                        timestamp: new Date()
                    });

                } catch (error) {
                    console.error("❌ Error placing bid:", error);

                    socket.emit("bid_rejected", {
                        message: "Failed to place bid."
                    });
                }
            }
        );

        // START / PAUSE / RESUME / CLOSE ITEM

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
                    if (
                        String(room.hostId) !==
                        String(socket.data.userId)
                    ) {
                        socket.emit("status_update_rejected", {
                            message: "Only the host can control the auction."
                        });
                        return;
                    }

                    // Find item
                    const item = room.itemQueue.find(
                        auctionItem =>
                            String(auctionItem.id) === String(itemId)
                    );

                    if (!item) {
                        socket.emit("status_update_rejected", {
                            message: "Auction item not found."
                        });
                        return;
                    }

                    const previousStatus = item.status;

                    // PAUSE OR CLOSE

                    if (status !== "active") {
                        const existingTimer = auctionTimers.get(roomId);
                        const endsAt = auctionEndsAt.get(roomId);

                        if (existingTimer) {
                            clearTimeout(existingTimer);
                            auctionTimers.delete(roomId);
                        }

                        // Preserve remaining time when paused
                        if (
                            status === "pending" &&
                            previousStatus === "active" &&
                            endsAt
                        ) {
                            const remainingTime = Math.max(
                                0,
                                endsAt - Date.now()
                            );

                            auctionRemaining.set(
                                roomId,
                                remainingTime
                            );

                            console.log(
                                `⏸️ Auction paused with ${Math.ceil(remainingTime / 1000)} seconds remaining.`
                            );
                        }

                        auctionEndsAt.delete(roomId);

                        // Closing the item permanently ends its timer
                        if (status === "unsold") {
                            auctionRemaining.delete(roomId);
                        }
                    }

                    // Update item status
                    item.status = status;

                    // START OR RESUME AUCTION

                    if (status === "active") {
                        room.status = "live";
                        room.currentItemId = item.id;

                        // Clear any existing timer for this room
                        const existingTimer = auctionTimers.get(roomId);

                        if (existingTimer) {
                            clearTimeout(existingTimer);
                            auctionTimers.delete(roomId);
                        }

                        // Use saved remaining time or start with 30 seconds
                        const remainingTime =
                            auctionRemaining.get(roomId) ?? 30 * 1000;

                        auctionRemaining.delete(roomId);

                        const endsAt = Date.now() + remainingTime;

                        auctionEndsAt.set(roomId, endsAt);

                        console.log(
                            `⏱️ Auction timer started for ${item.title}: ${Math.ceil(remainingTime / 1000)} seconds`
                        );

                        // Broadcast synchronized timer to everyone
                        io.to(roomId).emit("auction_timer_start", {
                            itemId,
                            endsAt,
                            serverNow: Date.now()
                        });

                        // Server-side auction timer
                        const timer = setTimeout(async () => {
                            try {
                                const updatedRoom = await Room.findById(roomId);

                                if (!updatedRoom) {
                                    return;
                                }

                                const updatedItem = updatedRoom.itemQueue.find(
                                    auctionItem =>
                                        String(auctionItem.id) ===
                                        String(itemId)
                                );

                                if (
                                    !updatedItem ||
                                    updatedItem.status !== "active"
                                ) {
                                    return;
                                }

                                console.log(
                                    `⏰ Timer ended for item ${itemId}`
                                );

                                // Clear timer state
                                auctionTimers.delete(roomId);
                                auctionEndsAt.delete(roomId);
                                auctionRemaining.delete(roomId);

                                // Determine auction result
                                const hasWinner =
                                    Boolean(updatedItem.highestBidderId) &&
                                    Boolean(updatedItem.highestBidderName) &&
                                    Number(updatedItem.currentBid) > 0;

                                if (hasWinner) {
                                    updatedItem.status = "sold";
                                } else {
                                    updatedItem.status = "unsold";
                                }

                                await updatedRoom.save();

                                // Notify everyone that the timer ended
                                io.to(roomId).emit("auction_timer_end", {
                                    itemId,
                                    message: "Bidding time has ended."
                                });

                                // Broadcast winner or unsold result
                                if (hasWinner) {
                                    console.log(
                                        `🏆 Item "${updatedItem.title}" sold to ${updatedItem.highestBidderName} for $${updatedItem.currentBid}`
                                    );

                                    io.to(roomId).emit("auction_winner", {
                                        itemId,
                                        itemTitle: updatedItem.title,
                                        winnerId: updatedItem.highestBidderId,
                                        winnerName: updatedItem.highestBidderName,
                                        winningBid: updatedItem.currentBid
                                    });

                                    io.to(roomId).emit("queue_updated", {
                                        itemId,
                                        status: "sold",
                                        message: `${updatedItem.title} was sold to ${updatedItem.highestBidderName} for $${updatedItem.currentBid}.`
                                    });

                                } else {
                                    console.log(
                                        `⚠️ Item "${updatedItem.title}" ended without any bids.`
                                    );

                                    io.to(roomId).emit("auction_winner", {
                                        itemId,
                                        itemTitle: updatedItem.title,
                                        winnerId: null,
                                        winnerName: null,
                                        winningBid: null
                                    });

                                    io.to(roomId).emit("queue_updated", {
                                        itemId,
                                        status: "unsold",
                                        message: `${updatedItem.title} received no bids and is unsold.`
                                    });
                                }

                            } catch (error) {
                                console.error(
                                    "❌ Error ending auction timer:",
                                    error
                                );

                            } finally {
                                auctionTimers.delete(roomId);
                                auctionEndsAt.delete(roomId);
                                auctionRemaining.delete(roomId);
                            }
                        }, remainingTime);

                        auctionTimers.set(roomId, timer);
                    }

                    // Save updated item status
                    await room.save();

                    console.log(
                        `🎛️ Host changed item "${item.title}" status to ${status}`
                    );

                    // Notify everyone about the status change
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

        // SELECT NEXT AUCTION ITEM

        socket.on(
            "next-auction-item",
            async (data: { roomId: string }) => {
                try {
                    const { roomId } = data;

                    const room = await Room.findById(roomId);

                    if (!room) {
                        socket.emit("next_item_rejected", {
                            message: "Auction room not found."
                        });
                        return;
                    }

                    // Only host can select next item
                    if (
                        String(room.hostId) !==
                        String(socket.data.userId)
                    ) {
                        socket.emit("next_item_rejected", {
                            message: "Only the host can select the next item."
                        });
                        return;
                    }

                    // Find current item
                    const currentItem = room.itemQueue.find(
                        item =>
                            String(item.id) ===
                            String(room.currentItemId)
                    );

                    // Current item must be finished
                    if (
                        currentItem &&
                        currentItem.status !== "sold" &&
                        currentItem.status !== "unsold"
                    ) {
                        socket.emit("next_item_rejected", {
                            message: "Finish the current item before selecting the next one."
                        });
                        return;
                    }

                    // Find next pending item
                    const nextItem = room.itemQueue.find(
                        item =>
                            item.status === "pending" &&
                            String(item.id) !==
                            String(room.currentItemId)
                    );

                    if (!nextItem) {
                        socket.emit("next_item_rejected", {
                            message: "There are no more items in the auction queue."
                        });
                        return;
                    }

                    // Select next item
                    room.currentItemId = nextItem.id;

                    await room.save();

                    console.log(
                        `➡️ Host selected next item: ${nextItem.title}`
                    );

                    io.to(roomId).emit("next_item_selected", {
                        itemId: nextItem.id,
                        item: nextItem
                    });

                } catch (error) {
                    console.error(
                        "❌ Error selecting next auction item:",
                        error
                    );

                    socket.emit("next_item_rejected", {
                        message: "Failed to select the next item."
                    });
                }
            }
        );

        // DISCONNECT

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
