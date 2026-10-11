const API_URL = 'http://localhost:5000/api';
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('roomId');

const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
const accessToken = localStorage.getItem('accessToken');

let socket = null;
let currentRoomData = null;

if (!roomId || !currentUser) {
    alert('Unauthorized or missing room ID. Redirecting...');
    window.location.href = '/';
}

// Initialize Room & Socket Connection
async function initRoom() {
    try {
    document.getElementById('user-badge').textContent = `👤 ${currentUser.username}`;

    // Fetch Room Details
    const res = await fetch(`${API_URL}/rooms/${roomId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    currentRoomData = data.room;
    renderRoomUI();

    // Connect Socket
    socket = io('http://localhost:5000');

    socket.on('connect', () => {
        socket.emit('join_auction_room', { roomId, userId: currentUser.id });
        appendHistory(`Connected to live auction stream.`);
    });

    socket.on('user_joined_broadcast', (data) => {
        appendHistory(`📢 ${data.message}`);
        // Refresh room data to update seat count
        fetchRoomDetails();
    });

    socket.on('bid_update', (data) => {
        document.getElementById('current-price').textContent = `$${data.bidAmount}`;
        appendHistory(`🔥 BID: $${data.bidAmount} by ${data.username || data.userId}`);
    });

    socket.on('queue_updated', (data) => {
        appendHistory(`📦 ${data.message}`);
        fetchRoomDetails();
    });

    socket.on('auction_ended', (data) => {
        showWinnerModal(data.winnerName, data.winningBid, data.itemTitle);
    });

    } catch (err) {
    alert(err.message);
    window.location.href = '/';
    }
}

async function fetchRoomDetails() {
    try {
    const res = await fetch(`${API_URL}/rooms/${roomId}`);
    const data = await res.json();
    if (res.ok) {
        currentRoomData = data.room;
        renderRoomUI();
    }
    } catch (e) {
    console.error(e);
    }
}

function renderRoomUI() {
    document.getElementById('room-title').textContent = currentRoomData.name;
    document.getElementById('room-id-badge').textContent = `ID: ${currentRoomData._id}`;
    document.getElementById('seat-counter').textContent = `${currentRoomData.participants.length} / ${currentRoomData.maxSeats} Seated`;

    // Render Seats
    const seatsGrid = document.getElementById('seats-grid');
    seatsGrid.innerHTML = '';
    for (let i = 0; i < currentRoomData.maxSeats; i++) {
    const participant = currentRoomData.participants[i];
    const isHost = participant === currentRoomData.hostId;
    const seatCard = document.createElement('div');
    
    if (participant) {
        seatCard.className = 'flex items-center justify-between bg-slate-900 border border-slate-800 p-2.5 rounded-xl';
        seatCard.innerHTML = `
        <div class="flex items-center space-x-2.5">
            <span class="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs border border-amber-500/30">${participant.substring(0, 2).toUpperCase()}</span>
            <div>
            <p class="text-xs font-semibold text-slate-200">User ${participant.substring(0, 6)}...</p>
            <p class="text-[10px] text-slate-500">${isHost ? '👑 Host' : 'Bidder'}</p>
            </div>
        </div>
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        `;
    } else {
        seatCard.className = 'flex items-center justify-between bg-slate-950/40 border border-dashed border-slate-800 p-2.5 rounded-xl text-slate-600 text-xs italic';
        seatCard.innerHTML = `<span>Seat ${i + 1} (Empty)</span>`;
    }
    seatsGrid.appendChild(seatCard);
    }

    // Show Host Controls if current user is the host
    if (currentUser.id === currentRoomData.hostId) {
    document.getElementById('host-controls').classList.remove('hidden');
    }

    // Render Active Item if queue exists
    if (currentRoomData.itemQueue && currentRoomData.itemQueue.length > 0) {
    const activeItem = currentRoomData.itemQueue[0];
    document.getElementById('item-title').textContent = activeItem.title;
    document.getElementById('item-desc').textContent = activeItem.description;
    document.getElementById('starting-price').textContent = `$${activeItem.startingPrice}`;
    document.getElementById('item-seller').textContent = `Seller: ${activeItem.sellerId.substring(0, 6)}...`;
    }
}

// Place Bid
function placeBid() {
    const bidAmount = Number(document.getElementById('bid-input').value);
    if (!bidAmount) {
    alert('Please enter a valid bid amount.');
    return;
    }

    socket.emit('place_bid', {
    roomId,
    userId: currentUser.id,
    username: currentUser.username,
    bidAmount,
    itemId: currentRoomData.itemQueue?.[0]?.id || 'item_1'
    });

    document.getElementById('bid-input').value = '';
}

// Host adds item to queue
async function addItemToQueue() {
    const title = document.getElementById('new-item-title').value;
    const startingPrice = document.getElementById('new-item-price').value;
    const description = document.getElementById('new-item-desc').value;

    if (!title || !startingPrice) {
    alert('Title and starting price are required.');
    return;
    }

    try {
    const res = await fetch(`${API_URL}/rooms/${roomId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, startingPrice, sellerId: currentUser.id })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    socket.emit('item_status_update', { roomId, itemId: data.item.id, message: `New item "${title}" queued for auction!` });
    
    document.getElementById('new-item-title').value = '';
    document.getElementById('new-item-price').value = '';
    document.getElementById('new-item-desc').value = '';
    fetchRoomDetails();
    } catch (err) {
    alert(err.message);
    }
}

function appendHistory(text) {
    const feed = document.getElementById('price-history-feed');
    const div = document.createElement('div');
    div.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
    div.className = 'text-slate-300 border-l-2 border-amber-500/50 pl-2 py-0.5';
    feed.appendChild(div);
    feed.scrollTop = feed.scrollHeight;
}

function showWinnerModal(winnerName, winningBid, itemTitle) {
    document.getElementById('winner-announcement').innerHTML = `<strong>${winnerName}</strong> won <strong>${itemTitle}</strong> with a winning bid of <strong class="text-amber-400">$${winningBid}</strong>!`;
    document.getElementById('winner-modal').classList.remove('hidden');
}

function closeWinnerModal() {
    window.location.href = '/';
}

function leaveRoom() {
    window.location.href = '/';
}

window.onload = initRoom;