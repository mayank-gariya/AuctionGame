const API_URL = "http://localhost:8000/api";
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("roomId");
const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
const accessToken = localStorage.getItem("accessToken");

let socket = null;
let currentRoomData = null;

if (!roomId || !currentUser) {
    alert("Unauthorized or missing room ID. Redirecting...");
    window.location.href = "/";
}

function getHeaders() {
    const headers = {
        "Content-Type": "application/json"
    };

    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }

    return headers;
}

async function initRoom() {
    try {
        const userBadge = document.getElementById("user-badge");

        if (userBadge) {
            userBadge.textContent = currentUser.username;
        }

        const res = await fetch(`${API_URL}/rooms/${roomId}`, {
            headers: getHeaders()
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "Unable to load room.");
        }
        socket = io("http://localhost:8000");

        currentRoomData = data.room;
        renderRoomUI();

        socket.on("connect", () => {
            socket.emit("join-auction", {
                roomId,
                userId: currentUser.id
            });

            appendHistory("Connected to live auction stream.", "system");
        });

        socket.on("user_joined_broadcast", (data) => {
            appendHistory(data.message, "join");
            fetchRoomDetails();
            currentRoomData.participants = data.participants;
            renderParticipants(currentRoomData.participants)
        });


        socket.on("bid_update", (data) => {
            appendHistory(
                `${data.userId} has placed a bid on item: $${data.bidAmount}`, 
                "bid", 
                "price-history-feed", 
                "activity-empty-bids"
            );
            
            const priceMobile = document.getElementById("current-price-mobile");
            const currentPrice = document.getElementById("current-price");

            if (priceMobile && currentPrice) {
                priceMobile.innerText = `$ ${data.bidAmount}`;
                currentPrice.textContent = `$${data.bidAmount}`;
            }
        });

        socket.on("queue_updated", (data) => {
            appendHistory(data.message, "queue");
            fetchRoomDetails();
        });

        socket.on("auction_ended", (data) => {
            appendHistory(
                `Auction ended — ${data.winnerName} won ${data.itemTitle}.`,
                "winner"
            );

            showWinnerModal(
                data.winnerName,
                data.winningBid,
                data.itemTitle
            );
        });

        socket.on("user_left_broadcast", (data) => {
            appendHistory(data.message, "leave");
            if (data.participants) {
                currentRoomData.participants = data.participants;
                renderParticipants(currentRoomData.participants)
                renderRoomUI();
            }
        });

        socket.on("connect_error", (error) => {
            console.error("Socket connection error:", error);
            appendHistory("Unable to connect to live auction stream.", "error");
        });

    } catch (err) {
        console.error(err);
        alert(err.message || "Something went wrong.");
        window.location.href = "/";
    }
}

async function fetchRoomDetails() {
    try {
        const res = await fetch(`${API_URL}/rooms/${roomId}`, {
            headers: getHeaders()
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "Unable to refresh room.");
        }

        currentRoomData = data.room;
        renderRoomUI();
        // console.log(currentRoomData);
    } catch (error) {
        console.error("Room refresh error:", error);
    }
}

function renderRoomUI() {
    if (!currentRoomData) return;

    const roomTitle = document.getElementById("room-title");
    const roomIdBadge = document.getElementById("room-id-badge");
    const seatCounter = document.getElementById("seat-counter");

    if (roomTitle) {
        roomTitle.textContent = currentRoomData.name || "Auction Room";
    }

    if (roomIdBadge) {
        roomIdBadge.textContent = `ID: ${currentRoomData._id || roomId}`;
    }

    const participants = currentRoomData.participants || [];
    const maxSeats = currentRoomData.maxSeats || 10;

    if (seatCounter) {
        seatCounter.textContent = `${participants.length} / ${maxSeats}`;
    }

    renderParticipants(participants, maxSeats);

    const hostControls = document.getElementById("host-controls");

    if (hostControls) {
        const isHost =
            String(currentUser.id) === String(currentRoomData.hostId);

        hostControls.classList.toggle("hidden", !isHost);
    }

    renderActiveItem();
}

function renderParticipants(participants, maxSeats=10) {
    const seatsGrid = document.getElementById("seats-grid");

    if (!seatsGrid) return;

    seatsGrid.innerHTML = "";

    participants.forEach((participant) => {
        if (!participant) return;

        const isHost =
            String(participant) === String(currentRoomData.hostId);

        const isCurrentUser=String(participant)===String(currentUser.id);
        const username=isCurrentUser
        ? currentUser.username
        : `${participant.substring(0,6)}`;

        const userCard = document.createElement("div");

        userCard.className =
            "flex items-center gap-2 shrink-0 bg-[#151515] border border-[#292929] rounded-full px-2 py-1.5";

        userCard.innerHTML = `
            <div class="w-7 h-7 rounded-full bg-[#242424] border border-[#383838] flex items-center justify-center text-[9px] font-bold text-neutral-200">
                ${username.substring(0,2).toUpperCase()}
            </div>
            <div class="pr-2">
                <p class="text-[10px] font-semibold text-neutral-300 whitespace-nowrap">
                    ${escapeHTML(username)}
                </p>
                <p class="text-[9px] text-neutral-600 whitespace-nowrap">
                    ${isHost ? "Host" : isCurrentUser? 'you' : "Bidder"}
                </p>
            </div>
            <span class="w-1.5 h-1.5 rounded-full bg-white ${isHost ? "" : "opacity-50"}"></span>
        `;

        seatsGrid.appendChild(userCard);
    });

    const emptySeats = Math.max(0, maxSeats - participants.length);

    if (emptySeats > 0) {
        const emptyIndicator = document.createElement("div");

        emptyIndicator.className =
            "flex items-center gap-2 shrink-0 px-3 py-2 rounded-full border border-dashed border-[#292929] text-[10px] text-neutral-700";

        emptyIndicator.textContent = `+${emptySeats} open`;
        seatsGrid.appendChild(emptyIndicator);
    }
}

function renderActiveItem() {
    const queue = currentRoomData.itemQueue || [];
    const title = document.getElementById("item-title");
    const description = document.getElementById("item-desc");
    const startingPrice = document.getElementById("starting-price");
    const seller = document.getElementById("item-seller");
    const currentPrice = document.getElementById("current-price");

    if (!queue.length) {
        if (title) title.textContent = "Waiting for host to queue item...";
        if (description) {
            description.textContent =
                "Description of the item will appear here once the auction begins.";
        }
        if (startingPrice) startingPrice.textContent = "$0";
        if (seller) seller.textContent = "Seller: —";
        if (currentPrice) currentPrice.textContent = "$0";
        return;
    }

    const activeItem = queue[0];

    if (title) {
        title.textContent = activeItem.title || "Untitled item";
    }

    if (description) {
        description.textContent =
            activeItem.description || "No description available.";
    }

    if (startingPrice) {
        startingPrice.textContent = `$${activeItem.startingPrice || 0}`;
    }

    if (seller) {
        const sellerId = activeItem.sellerId || "";
        seller.textContent = sellerId
            ? `Seller: ${sellerId.substring(0, 6)}...`
            : "Seller: —";
    }

    if (currentPrice) {
        const bid =
            activeItem.currentBid ??
            activeItem.highestBid ??
            activeItem.startingPrice ??
            0;

        currentPrice.textContent = `$${bid}`;
    }
}

function placeBid() {
    if (!socket) {
        alert("You are not connected to the auction.");
        return;
    }

    const input = document.getElementById("bid-input");
    const bidAmount = Number(input.value);

    if (!bidAmount || bidAmount <= 0) {
        alert("Please enter a valid bid amount.");
        return;
    }

    const activeItem = currentRoomData?.itemQueue?.[0];

    socket.emit("place-bid", {
        roomId,
        userId: currentUser.id,
        bidAmount,
        itemId: activeItem?.id || activeItem?._id || "item_1"
    });

    input.value = "";
    input.focus();
}

document.addEventListener("keydown", (event) => {
    if (
        event.key === "Enter" &&
        document.activeElement?.id === "bid-input"
    ) {
        event.preventDefault();
        placeBid();
    }
});

async function addItemToQueue() {
    const title = document
        .getElementById("new-item-title")
        .value
        .trim();

    const startingPrice = document.getElementById("new-item-price").value;

    const description = document
        .getElementById("new-item-desc")
        .value
        .trim();

    if (!title || !startingPrice) {
        alert("Title and starting price are required.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/rooms/${roomId}/items`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
                title,
                description,
                startingPrice,
                sellerId: currentUser.id
            })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "Unable to add item.");
        }

        socket.emit("item_status_update", {
            roomId,
            itemId: data.item.id || data.item._id,
            status: "Inserted In Auction"
        });

        document.getElementById("new-item-title").value = "";
        document.getElementById("new-item-price").value = "";
        document.getElementById("new-item-desc").value = "";
        document.getElementById("starting-price-mobile").innerText = startingPrice

        appendHistory(
            `New item "${title}" added to the auction queue.`,
            "queue"
        );

        fetchRoomDetails();
    } catch (error) {
        console.error("Add item error:", error);
        alert(error.message || "Unable to add item.");
    }
}


function appendHistory(text, type = "system", loc = "room-activity-feed", loc2 = "activity-empty") {
    const feed = document.getElementById(loc);
    if (!feed) return;

    const emptyState = feed.querySelector(`.${loc2}`);
    if (emptyState) {
        emptyState.remove();
    }

    const row = document.createElement("div");
    const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });

    let icon = "•";
    let iconClass = "bg-[#1b1b1b] text-neutral-500";
    let messageClass = "text-neutral-400";

    if (type === "bid") {
        icon = "\$";
        iconClass = "bg-white text-black";
        messageClass = "text-white font-medium";
    } else if (type === "join") {
        icon = "+";
        iconClass = "bg-[#1d1d1d] text-neutral-300";
        messageClass = "text-neutral-300";
    } else if (type === "queue") {
        icon = "□";
        iconClass = "bg-[#1b1b1b] text-neutral-300";
        messageClass = "text-neutral-300";
    } else if (type === "winner") {
        icon = "✓";
        iconClass = "bg-white text-black";
        messageClass = "text-white font-semibold";
    } else if (type === "error") {
        icon = "!";
        iconClass = "bg-[#1c1c1c] text-neutral-400";
        messageClass = "text-neutral-500";
    }

    row.className = "activity-row mb-2";

    row.innerHTML = `
        <div class="flex items-start gap-3">
            <div class="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${iconClass}">
                ${icon}
            </div>
            <div class="min-w-0 flex-1">
                <p class="text-[11px] leading-5 break-words ${messageClass}">
                    ${escapeHTML(text)}
                </p>
                <p class="mt-0.5 text-[9px] text-neutral-700">
                    ${time}
                </p>
            </div>
        </div>
    `;

    feed.appendChild(row);
    feed.scrollTop = feed.scrollHeight;
}

function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
}

function showWinnerModal(winnerName, winningBid, itemTitle) {
    const announcement =
        document.getElementById("winner-announcement");

    announcement.innerHTML = `
        <strong class="text-white">${escapeHTML(winnerName)}</strong>
        won
        <strong class="text-white">${escapeHTML(itemTitle)}</strong>
        with a winning bid of
        <strong class="text-white">$${winningBid}</strong>.
    `;

    const modal = document.getElementById("winner-modal");

    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function closeWinnerModal() {
    window.location.href = "/";
}

function leaveRoom() {
    if (socket) {
        socket.emit("leave_auction_room", {
            roomId,
            userId: currentUser.id
        });

        socket.disconnect();
    }

    window.location.href = "/";
}

window.addEventListener("beforeunload", () => {
    if (socket) {
        socket.emit("leave_auction_room", {
            roomId,
            userId: currentUser.id
        });
    }
});

document.addEventListener("DOMContentLoaded", () => {
    window.onload = initRoom;
});