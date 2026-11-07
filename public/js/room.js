    const API_URL = "http://localhost:8000/api";
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get("roomId");
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
    const accessToken = localStorage.getItem("accessToken");
    let auctionTimerInterval = null;

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

    function updateAuctionTimerDisplay(seconds) {
        const timerElement = document.getElementById("auction-timer");

        if (!timerElement) return;

        const safeSeconds = Math.max(0, Math.ceil(seconds));

        const minutes = Math.floor(safeSeconds / 60);
        const remainingSeconds = safeSeconds % 60;

        timerElement.textContent =
            `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
    }

function startAuctionCountdown(itemId, endsAt, serverNow) {
    const timerElement = document.getElementById("auction-timer");

    if (!timerElement) return;

    if (auctionTimerInterval) {
        clearInterval(auctionTimerInterval);
    }

    // Calculate the difference between server and client clocks
    const clockOffset = serverNow - Date.now();

    const updateCountdown = () => {
        const remainingSeconds = Math.max(
            0,
            Math.ceil((endsAt - (Date.now() + clockOffset)) / 1000)
        );

        updateAuctionTimerDisplay(remainingSeconds);

        if (remainingSeconds <= 0) {
            clearInterval(auctionTimerInterval);
            auctionTimerInterval = null;
        }
    };

    updateCountdown();

    auctionTimerInterval = setInterval(updateCountdown, 250);
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
                userId: currentUser.id,
                username:currentUser.username
            });

            appendHistory("Connected to live auction stream.", "system");
        });

        socket.on("user_joined_broadcast", (data) => {
            appendHistory(data.message, "join");
            fetchRoomDetails();
            currentRoomData.participants = data.participants;
            renderParticipants(currentRoomData.participants)
        });

        socket.on("bid_rejected", (data) => {
            console.error("❌ Bid rejected:", data);

            appendHistory(
                data.message || "Bid was rejected.",
                "error"
            );

            alert(data.message || "Bid was rejected.");
        });

        socket.on("auction_timer_start", (data) => {
            const { itemId, endsAt, serverNow } = data;

            console.log("⏱️ Auction timer started:", {
                itemId,
                endsAt,
                serverNow
            });

            startAuctionCountdown(itemId, endsAt, serverNow);
        });

        socket.on("auction_timer_end", (data) => {
            console.log("⏰ Auction timer ended:", data);

            if (auctionTimerInterval) {
                clearInterval(auctionTimerInterval);
                auctionTimerInterval = null;
            }

            updateAuctionTimerDisplay(0);
        });

        socket.on("next_item_selected", (data) => {
            console.log("➡️ Next item selected:", data);

            appendHistory(
                `Next item selected: ${data.item.title}`,
                "queue"
            );

            fetchRoomDetails();
        });

        socket.on("next_item_rejected", (data) => {
            console.error("❌ Next item rejected:", data);

            alert(
                data.message ||
                "Unable to select the next item."
            );
        });

        socket.on("bid_update", (data) => {
            appendHistory(
                `${data.username} has placed a bid on item: $${data.bidAmount}`,
                "bid",
                "price-history-feed",
                "activity-empty-bids"
            );

            const activeItem = currentRoomData?.itemQueue?.find(
                (item) =>
                    String(item.id || item._id) === String(data.itemId)
            );

            if (activeItem) {
                activeItem.currentBid = Number(data.bidAmount);
                activeItem.highestBidderId = data.userId;
                activeItem.highestBidderName = data.username;
            }

            // Update the visible current/highest bid immediately
            const currentPrices = document.querySelectorAll(
                "#current-price, #current-highest-price"
            );

            currentPrices.forEach((element) => {
                element.textContent =
                    `$${Number(data.bidAmount).toLocaleString()}`;
            });

            // Update the complete active-item section
            renderActiveItem();
        });

        
        socket.on("queue_updated", (data) => {
            appendHistory(data.message, "queue");
            fetchRoomDetails();
        });

        socket.on("status_update_rejected", (data) => {
            console.error("❌ Status update rejected:", data);

            appendHistory(
                data.message || "Auction control action was rejected.",
                "error"
            );

            alert(data.message || "Auction control action was rejected.");
        });

        socket.on("auction_winner", (data) => {
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
        roomTitle.textContent = (currentRoomData.name).toUpperCase() || "Auction Room".toUpperCase();
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

    const isHost =
        String(currentUser.id) === String(currentRoomData.hostId);

    if (hostControls) {
        hostControls.classList.toggle("hidden", !isHost);
    }

    // Disable bid area for the host
    const bidControls = document.getElementById("bid-controls");
    const hostBidNotice = document.getElementById("host-bid-notice");
    const bidHint = document.getElementById("bid-hint");
    const bidInput = document.getElementById("bid-input");

    if (bidControls) {
        bidControls.classList.toggle("hidden", isHost);
    }
    if (hostBidNotice) {
        hostBidNotice.classList.toggle("hidden", !isHost);
    }
    if (bidHint) {
        bidHint.classList.toggle("hidden", isHost);
    }
    if (bidInput) {
        bidInput.disabled = isHost;
    }

    renderActiveItem();
    updateHostAuctionControls();
}

function getCurrentAuctionItem() {
    if (!currentRoomData) return null;

    const queue = currentRoomData.itemQueue || [];

    if (currentRoomData.currentItemId) {
        return queue.find(
            item =>
                String(item.id || item._id) ===
                String(currentRoomData.currentItemId)
        ) || null;
    }

    return queue.find(
        item => item.status === "pending" ||
                item.status === "active"
    ) || null;
}


function updateHostAuctionControls() {
    const item = getCurrentAuctionItem();

    const startBtn = document.getElementById("start-item-btn");
    const pauseBtn = document.getElementById("pause-item-btn");
    const resumeBtn = document.getElementById("resume-item-btn");
    const closeBtn = document.getElementById("close-item-btn");

    const statusText = document.getElementById("host-item-status");
    const statusDot = document.getElementById("host-item-status-dot");

    if (!item) {
        [startBtn, pauseBtn, resumeBtn, closeBtn].forEach((btn) => {
            if (btn) btn.disabled = true;
    });

    if (statusText) {
        statusText.textContent = "No item";
    }

    if (statusDot) {
        statusDot.className =
            "w-2 h-2 rounded-full bg-neutral-400";
    }

        return;
    }

    const status = item.status || "pending";

    // Disable everything first
    [startBtn, pauseBtn, resumeBtn, closeBtn].forEach((btn) => {
        if (btn) btn.disabled = true;
    });

    console.log(status)    

    if (status === "pending") {

        // Allow starting/resuming
        if (startBtn) startBtn.disabled = false;
        if (resumeBtn) resumeBtn.disabled = false;

        if (statusText) {
            statusText.textContent = "pending";
        }   

        if (statusDot) {
            statusDot.className =
                "w-2 h-2 rounded-full bg-neutral-400";
        }
    }

    else if (status === "active") {
        if (pauseBtn) pauseBtn.disabled = false;
        if (closeBtn) closeBtn.disabled = false;

        if (statusText) {
            statusText.textContent = "Bidding Active";
        }
        if (statusDot) {
            statusDot.className =
                "w-2 h-2 rounded-full bg-emerald-500";
        }
    }
    else if (status === "unsold") {
        if (statusText) {
            statusText.textContent = "Closed";
        }

        if (statusDot) {
            statusDot.className =
                "w-2 h-2 rounded-full bg-neutral-400";
        }
    }
    else if (status === "sold") {
        if (statusText) {
            statusText.textContent = "Sold";
        }
        if (statusDot) {
            statusDot.className =
                "w-2 h-2 rounded-full bg-neutral-400";
        }
    }
}

function updateItemStatus(status) {
    const item = getCurrentAuctionItem();

    if (!item) {
        alert("There is no item to control.");
        return;
    }

    if (!socket || !socket.connected) {
        alert("You are not connected to the auction.");
        return;
    }

    const itemId = item.id || item._id;

    console.log("🎛️ Sending item status update:", {
        roomId,
        itemId,
        status,
        socketConnected: socket.connected,
        currentUserId: currentUser.id,
        hostId: currentRoomData?.hostId
    });

    socket.emit("item_status_update", {
        roomId,
        itemId,
        status
    });
}

function selectNextItem() {
    if (!socket || !socket.connected) {
        alert("You are not connected to the auction.");
        return;
    }

    if (
        !currentUser ||
        String(currentUser.id) !== String(currentRoomData?.hostId)
        ){
        alert("Only the host can select the next item.");
        return;
    }

    socket.emit("next-auction-item", {
        roomId
    });
}


function startCurrentItem() {
    updateItemStatus("active");
}


function pauseCurrentItem() {
    updateItemStatus("pending");
}


function resumeCurrentItem() {
    updateItemStatus("active");
}


function closeCurrentItem() {
    updateItemStatus("unsold");
}

function renderParticipants(participants, maxSeats = 10) {
    const seatsGrid = document.getElementById("seats-grid");

    if (!seatsGrid) return;

    seatsGrid.innerHTML = "";

    participants.forEach((participant) => {
        if (!participant) return;

        const participantId = String(participant.userId);
        const participantName = participant.username || "Unknown User";

        const isHost =
            participantId === String(currentRoomData.hostId);

        const isCurrentUser =
            participantId === String(currentUser.id);

        const username = isCurrentUser
            ? currentUser.username
            : participantName;

        const userCard = document.createElement("div");

        userCard.className = "user-card";

        userCard.innerHTML = `
            <div class="user-avatar">
                ${escapeHTML(username.substring(0, 2).toUpperCase())}
            </div>

            <div>
                <p class="user-name">
                    ${escapeHTML(username)}
                </p>

                <p class="user-role">
                    ${isHost ? "Host" : isCurrentUser ? "You" : "Bidder"}
                </p>
            </div>

            <span class="user-status-dot ${isHost ? "" : "muted"}"></span>
        `;

        seatsGrid.appendChild(userCard);
    });

    const emptySeats = Math.max(
        0,
        maxSeats - participants.length
    );

    if (emptySeats > 0) {
        const emptyIndicator = document.createElement("div");

        emptyIndicator.className = "empty-seat";
        emptyIndicator.textContent = `+${emptySeats} open`;
        seatsGrid.appendChild(emptyIndicator);
    }
}

function renderActiveItem() {
    const queue = currentRoomData.itemQueue || [];

    const title = document.getElementById("item-title");
    const description = document.getElementById("item-desc");

    // There may be more than one starting-price element
    const startingPrices = document.querySelectorAll("#starting-price");

    const seller = document.getElementById("item-seller");

    // Current bid displays
    const currentPrices = document.querySelectorAll(
        "#current-price, #current-highest-price"
    );

    if (!queue.length) {
        if (title) {
            title.textContent = "Waiting for host to queue item...";
        }

        if (description) {
            description.textContent =
                "Description of the item will appear here once the auction begins.";
        }

        startingPrices.forEach((element) => {
            element.textContent = "$0";
        });

        currentPrices.forEach((element) => {
            element.textContent = "$0";
        });

        if (seller) {
            seller.textContent = "Seller: —";
        }

        return;
    }

    const activeItem = getCurrentAuctionItem();

    if (!activeItem) {
        if (title) title.textContent = "Waiting for next item...";
        if (description) {
            description.textContent = "The host has not selected an item yet.";
        }

        startingPrices.forEach(el => el.textContent = "$0");
        currentPrices.forEach(el => el.textContent = "$0");

        if (seller) seller.textContent = "Seller: —";

        return;
    }

    if (title) {
        title.textContent = activeItem.title || "Untitled item";
    }

    if (description) {
        description.textContent =
            activeItem.description || "No description available.";
    }

    const startingPrice = Number(activeItem.startingPrice || 0);

    startingPrices.forEach((element) => {
        element.textContent = `$${startingPrice}`;
    });

    const currentBid = Number(
        activeItem.currentBid ??
        activeItem.highestBid ??
        activeItem.startingPrice ??
        0
    );

    currentPrices.forEach((element) => {
        element.textContent = `$${currentBid}`;
    });


    if (seller) {
        const sellerId = activeItem.sellerId || "";
        let sellerName = null;

        if (sellerId) {
            const participants = currentRoomData.participants || [];

            const sellerParticipant = participants.find(
                (p) =>
                    p &&
                    String(p.userId) === String(sellerId)
            );

            if (sellerParticipant?.username) {
                sellerName = sellerParticipant.username;
            } else if (
                String(sellerId) === String(currentUser.id)
            ) {
                sellerName = currentUser.username;
            } else if (
                currentRoomData.hostId &&
                String(sellerId) === String(currentRoomData.hostId)
            ) {
                const hostParticipant = participants.find(
                    (p) =>
                        p &&
                        String(p.userId) ===
                        String(currentRoomData.hostId)
                );

                if (hostParticipant?.username) {
                    sellerName = hostParticipant.username;
                }
            }
        }

        seller.textContent = sellerName
            ? `Seller: ${sellerName}`
            : sellerId
                ? `Seller: ${sellerId.substring(0, 6)}...`
                : "Seller: —";
    }
}

function placeBid() {
    if (!socket) {
        alert("You are not connected to the auction.");
        return;
    }

    // Host cannot place bids
    if (
        currentRoomData &&
        String(currentUser.id) === String(currentRoomData.hostId)
    ) {
        alert("Host cannot place bids.");
        return;
    }

    // Get current auction item FIRST
    const activeItem = getCurrentAuctionItem();

    if (!activeItem) {
        alert("There is no item currently in the auction.");
        return;
    }

    const bidInput = document.getElementById("bid-input");

    // Bidding is allowed only when item is active
    if (activeItem.status !== "active") {
        alert("Bidding is not open for this item.");
        return;
    }

    const bidAmount = Number(bidInput.value);

    const currentBid = Number(
        activeItem.currentBid || activeItem.startingPrice
    );

    if (!bidAmount || bidAmount <= 0 || bidAmount <= currentBid) {
        alert(`Bid must be higher than the current bid of $${currentBid}`);
        return;
    }

    socket.emit("place-bid", {
        roomId,
        userId: currentUser.id,
        bidAmount,
        itemId: activeItem.id || activeItem._id
    });

    bidInput.value = "";
    bidInput.focus();
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

        document.getElementById("new-item-title").value = "";
        document.getElementById("new-item-price").value = "";
        document.getElementById("new-item-desc").value = "";

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
    let iconClass = "bg-[#f1f1ee] text-neutral-500";
    let messageClass = "text-neutral-600";

    if (type === "bid") {
        icon = "\$";
        iconClass = "bg-neutral-900 text-white";
        messageClass = "text-neutral-900 font-medium";
    } else if (type === "join") {
        icon = "+";
        iconClass = "bg-[#f1f1ee] text-neutral-600";
        messageClass = "text-neutral-600";
    } else if (type === "queue") {
        icon = "□";
        iconClass = "bg-[#f1f1ee] text-neutral-600";
        messageClass = "text-neutral-600";
    } else if (type === "winner") {
        icon = "✓";
        iconClass = "bg-neutral-900 text-white";
        messageClass = "text-neutral-900 font-semibold";
    } else if (type === "error") {
        icon = "!";
        iconClass = "bg-[#f1f1ee] text-neutral-500";
        messageClass = "text-neutral-500";
    } else if (type === "leave") {
        icon = "–";
        iconClass = "bg-[#f1f1ee] text-neutral-500";
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
                <p class="mt-0.5 text-[9px] text-neutral-400">
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
        <strong class="text-neutral-900">${escapeHTML(winnerName)}</strong>
        won
        <strong class="text-neutral-900">${escapeHTML(itemTitle)}</strong>
        with a winning bid of
        <strong class="text-neutral-900">$${winningBid}</strong>.
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
            userId: currentUser.id,
            username:currentUser.username
        });
    }
});

document.addEventListener("DOMContentLoaded", initRoom);