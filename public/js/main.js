let activeSocket = null;
async function openAuctionModal(roomId) {
  const modal = document.getElementById('auctionModal');
  const modalBody = document.getElementById('modal-room-body');
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const accessToken = localStorage.getItem('accessToken'); 

  modal.style.display = 'block';
  document.getElementById('modal-room-title').textContent = 'Connecting...';
  document.getElementById('modal-room-id-badge').textContent = `ID: ${roomId}`;
  document.getElementById('modal-user-badge').textContent = `👤 ${currentUser.username || 'User'}`;

  modalBody.innerHTML = `<div style="grid-column: span 3; text-align: center; color: #94a3b8; padding: 4rem;">Loading auction arena components...</div>`;

  try {
    // PASS THE ACCESS TOKEN IN HEADERS HERE
    const res = await fetch(`/api/rooms/${roomId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Room not found.');

    const room = data.room;
    document.getElementById('modal-room-title').textContent = room.name;

    // Render exact 3-column layout inside modal
    modalBody.innerHTML = `
      <!-- LEFT: Seats -->
      <div style="background: #0f172a; border: 1px solid #1f2937; border-radius: 0.75rem; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1f2937; padding-bottom: 0.5rem;">
          <h3 style="font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; font-weight: 600; margin: 0;">Seats</h3>
          <span id="modal-seat-counter" style="font-size: 0.75rem; background: rgba(245, 158, 11, 0.1); color: #fbbf24; font-weight: bold; padding: 0.15rem 0.5rem; border-radius: 9999px;">${room.participants.length} / ${room.maxSeats}</span>
        </div>
        <div id="modal-seats-grid" style="display: flex; flex-direction: column; gap: 0.5rem; overflow-y: auto; max-height: 400px;"></div>
      </div>

      <!-- CENTER: Active Item & Bidding -->
      <div style="background: #0f172a; border: 1px solid #1f2937; border-radius: 0.75rem; padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; gap: 1rem;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <span style="font-size: 0.70rem; text-transform: uppercase; color: #818cf8; font-weight: bold; background: rgba(99, 102, 241, 0.1); padding: 0.2rem 0.5rem; border-radius: 9999px;">Current Lot</span>
            <span id="modal-item-seller" style="font-size: 0.75rem; color: #94a3b8;">Seller: --</span>
          </div>
          <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid #1f2937; border-radius: 0.5rem; padding: 1rem;">
            <h4 id="modal-item-title" style="font-size: 1.15rem; font-weight: bold; color: #f8fafc; margin: 0 0 0.5rem 0;">Waiting for host to queue item...</h4>
            <p id="modal-item-desc" style="font-size: 0.8rem; color: #94a3b8; margin: 0 0 1rem 0;"></p>
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #1e293b; pt: 0.75rem;">
              <div>
                <span style="font-size: 0.7rem; color: #64748b;">Highest Bid</span>
                <p id="modal-current-price" style="font-size: 1.25rem; font-weight: 900; color: #fbbf24; margin: 0;">$0</p>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 0.7rem; color: #64748b;">Starting Price</span>
                <p id="modal-starting-price" style="font-size: 0.85rem; font-weight: 600; color: #cbd5e1; margin: 0;">$0</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Bid Input -->
        <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid #1f2937; border-radius: 0.5rem; padding: 0.75rem; display: flex; gap: 0.5rem;">
          <input type="number" id="modal-bid-input" placeholder="Bid amount ($)" style="flex: 1; background: #030712; border: 1px solid #1f2937; border-radius: 0.375rem; padding: 0.5rem; color: #fff; font-size: 0.85rem; outline: none;">
          <button onclick="submitModalBid('${roomId}')" style="background: #fbbf24; color: #0f172a; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; font-weight: bold; font-size: 0.85rem; cursor: pointer;">Bid 🚀</button>
        </div>
      </div>

      <!-- RIGHT: Price History -->
      <div style="background: #0f172a; border: 1px solid #1f2937; border-radius: 0.75rem; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
        <div style="border-bottom: 1px solid #1f2937; padding-bottom: 0.5rem;">
          <h3 style="font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; font-weight: 600; margin: 0;">Price Feed</h3>
        </div>
        <div id="modal-price-feed" style="flex: 1; overflow-y: auto; max-height: 400px; display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.75rem; font-family: monospace;">
          <span style="color: #64748b; font-style: italic;">Connected to live auction feed...</span>
        </div>
      </div>
    `;

    // Render initial seats
    renderModalSeats(room, currentUser.id);

    // Render active item if present
    if (room.itemQueue && room.itemQueue.length > 0) {
      const item = room.itemQueue[0];
      document.getElementById('modal-item-title').textContent = item.title;
      document.getElementById('modal-item-desc').textContent = item.description;
      document.getElementById('modal-starting-price').textContent = `$${item.startingPrice}`;
      document.getElementById('modal-item-seller').textContent = `Seller: ${item.sellerId.substring(0, 6)}...`;
    }

    // Connect Socket for this room
    activeSocket = io('http://localhost:8000');
    activeSocket.on('connect', () => {
      activeSocket.emit('join_auction_room', { roomId, userId: currentUser.id });
    });

    activeSocket.on('bid_update', (d) => {
      document.getElementById('modal-current-price').textContent = `$${d.bidAmount}`;
      appendModalFeed(`🔥 Bid: $${d.bidAmount} by ${d.username || d.userId}`);
    });

    activeSocket.on('user_joined_broadcast', (d) => {
      appendModalFeed(`📢 ${d.message}`);
    });

    // Close Modal Event Handler
    document.getElementById('closeModalBtn').onclick = () => {
      if (activeSocket) activeSocket.disconnect();
      modal.style.display = 'none';
    };

  } catch (err) {
    alert(err.message);
    modal.style.display = 'none';
  }
}

function renderModalSeats(room, currentUserId) {
  const container = document.getElementById('modal-seats-grid');
  if (!container) return;
  container.innerHTML = '';

  for (let i = 0; i < room.maxSeats; i++) {
    const participant = room.participants[i];
    const seatDiv = document.createElement('div');
    
    if (participant) {
      seatDiv.style.cssText = "display: flex; align-items: center; justify-content: space-between; background: #030712; border: 1px solid #1e293b; padding: 0.5rem; border-radius: 0.5rem;";
      seatDiv.innerHTML = `
        <span style="font-size: 0.75rem; color: #cbd5e1; font-weight: 500;">👤 User ${participant.substring(0, 6)}...</span>
        <span style="width: 6px; height: 6px; background: #10b981; border-radius: 50%;"></span>
      `;
    } else {
      seatDiv.style.cssText = "display: flex; align-items: center; justify-content: space-between; background: rgba(3, 7, 18, 0.4); border: 1px dashed #1e293b; padding: 0.5rem; border-radius: 0.5rem; color: #475569; font-size: 0.7rem;";
      seatDiv.innerHTML = `<span>Seat ${i + 1} (Empty)</span>`;
    }
    container.appendChild(seatDiv);
  }
}

function submitModalBid(roomId) {
  const input = document.getElementById('modal-bid-input');
  const bidAmount = Number(input.value);
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

  if (!bidAmount) return alert('Enter a valid bid.');

  if (activeSocket) {
    activeSocket.emit('place_bid', {
      roomId,
      userId: currentUser.id,
      username: currentUser.username,
      bidAmount,
      itemId: 'item_1'
    });
  }
  input.value = '';
}

function appendModalFeed(text) {
  const feed = document.getElementById('modal-price-feed');
  if (!feed) return;
  const div = document.createElement('div');
  div.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  div.style.cssText = "color: #e2e8f0; border-left: 2px solid #fbbf24; padding-left: 0.35rem;";
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
}

function renderHeaderAuth() {
  const headerActions = document.getElementById('header-actions');
  if (!headerActions) return;

  const storedUser = localStorage.getItem('currentUser');
  const accessToken = localStorage.getItem('accessToken');

  if (storedUser && accessToken) {
    try {
      const user = JSON.parse(storedUser);
      const userInitial = user.username ? user.username.charAt(0).toUpperCase() : 'U';

      headerActions.innerHTML = `
        <div id="profileWrapper" style="position: relative; display: inline-block;">
          <div id="profileTrigger" style="display: flex; align-items: center; gap: 0.5rem; background: #1e293b; border: 1px solid #334155; padding: 0.35rem 0.85rem; border-radius: 9999px; color: #f8fafc; font-size: 0.875rem; cursor: pointer;">
            <span style="background: #f59e0b; color: #0f172a; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">${userInitial}</span>
            <span style="font-weight: 500;">${user.username}</span>
          </div>

          <!-- Hover Dropdown Menu -->
          <div id="profileDropdown" style="display: none; position: absolute; right: 0; top: calc(100% + 8px); background: #1e293b; color: #f8fafc; border: 1px solid #334155; border-radius: 8px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); padding: 1rem; min-width: 200px; z-index: 1000;">
            <p style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.15rem; text-transform: uppercase; letter-spacing: 0.05em;">Signed in as</p>
            <p style="font-size: 0.85rem; font-weight: 600; margin-bottom: 0.75rem; word-break: break-all; color: #cbd5e1;">${user.email}</p>
            <hr style="border: none; border-top: 1px solid #334155; margin-bottom: 0.75rem;">
            <button id="logoutBtn" style="width: 100%; text-align: left; background: #ef4444; color: #fff; border: none; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: background 0.2s;">Log out</button>
          </div>
        </div>
      `;

      const wrapper = document.getElementById('profileWrapper');
      const dropdown = document.getElementById('profileDropdown');
      const logoutBtn = document.getElementById('logoutBtn');

      // Robust Hover Handling
      wrapper.addEventListener('mouseenter', () => {
        dropdown.style.display = 'block';
      });

      wrapper.addEventListener('mouseleave', () => {
        dropdown.style.display = 'none';
      });

      // Secure Logout Handler
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('accessToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('refreshToken');
        window.location.reload();
      });

    } catch (e) {
      console.error("Session parse error:", e);
      localStorage.clear();
    }
  } else {
    // Render default Sign In / Create account buttons if logged out
    headerActions.innerHTML = `
      <a class="text-link" href="/signin.html">Sign in</a>
      <a class="button button-dark button-small" href="/signup.html">Create account</a>
    `;
  }
}

function checkAuthOrRedirect() {
  const token = localStorage.getItem('accessToken');
  const user = localStorage.getItem('currentUser');
  
  if (!token || !user) {
    alert('You must be signed in to perform this action.');
    window.location.href = '/signin.html';
    return false;
  }
  return true;
}

// Manage Room Section Visibility based on Auth State
function handleRoomSectionVisibility() {
  const roomSection = document.querySelector('.room-control-section');
  if (!roomSection) return;

  const token = localStorage.getItem('accessToken');
  if (!token) {
    // Hide or replace the room creation section for unauthenticated guests
    roomSection.style.display = 'none';
  } else {
    roomSection.style.display = 'block';
  }
}


document.addEventListener("DOMContentLoaded", () => {
  renderHeaderAuth();
  handleRoomSectionVisibility();

  const createRoomBtn = document.getElementById('createRoomBtn');
  const joinRoomBtn = document.getElementById('joinRoomBtn');

  if (createRoomBtn) {
    createRoomBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!checkAuthOrRedirect()) return;

      const roomNameInput = document.getElementById('quickRoomName');
      const roomName = roomNameInput ? roomNameInput.value.trim() : '';
      const accessToken = localStorage.getItem('accessToken');

      // console.log('Sending Token:', accessToken);  

      if (!roomName) {
        alert('Please enter a name for your auction room.');
        return;
      }

      try {
        const response = await fetch('/api/rooms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ name: roomName })
        });

        const data = await response.json();

        if (response.status === 401 || response.status === 403) {
          alert('Session expired. Please sign in again.');
          localStorage.clear();
          window.location.href = '/signin.html';
          return;
        }

        if (!response.ok) throw new Error(data.error || 'Failed to create room.');

        roomNameInput.value = '';
        
        // Open Modal and Initialize Room Session
        openAuctionModal(data.room._id);

      } catch (err) {
        console.error('Room creation error:', err);
        alert(`Failed to create room: ${err.message}`);
      }
    });
  }

  // 2. Secured Join Room Handler (Loads inside modal)
  if (joinRoomBtn) {
    joinRoomBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!checkAuthOrRedirect()) return;

      const roomIdInput = document.getElementById('quickRoomId');
      const roomId = roomIdInput ? roomIdInput.value.trim() : '';

      if (!roomId) {
        alert('Please enter a valid Room ID.');
        return;
      }

      roomIdInput.value = '';
      openAuctionModal(roomId);
    });
  }
  
  const countdowns = document.querySelectorAll(".countdown");

  function updateCountdown() {
    countdowns.forEach((counter) => {
      const end = new Date(counter.dataset.end).getTime();
      const now = Date.now();
      const distance = end - now;
      const output = counter.querySelector("strong");

      if (distance <= 0) {
        output.textContent = "Auction ended";
        return;
      }

      const hours = Math.floor(distance / (1000 * 60 * 60));
      const minutes = Math.floor((distance / (1000 * 60)) % 60);
      const seconds = Math.floor((distance / 1000) % 60);

      output.textContent =
        `${String(hours).padStart(2, "0")}:` +
        `${String(minutes).padStart(2, "0")}:` +
        `${String(seconds).padStart(2, "0")}`;
    });
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  // Watchlist buttons
  document.querySelectorAll(".watch-button").forEach((button) => {
    button.addEventListener("click", () => {
      button.classList.toggle("saved");
      button.textContent = button.classList.contains("saved") ? "♥" : "♡";
    });
  });

  // Replace this later with your Node/Express POST request.
  document.querySelectorAll(".bid-button").forEach((button) => {
    button.addEventListener("click", () => {
      alert("Sign in to place a bid.");
      window.location.href = "/signin.html";
    });
  });

});
