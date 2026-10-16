function renderModalSeats(room, currentUserId) {
  const container = document.getElementById('modal-seats-grid');
  if (!container) return;
  container.innerHTML = '';

  for (let i = 0; i < room.maxSeats; i++) {
    const participant = room.participants[i];
    const seatDiv = document.createElement('div');
    
    if (participant) {
    seatDiv.style.cssText =
        "display: flex; align-items: center; justify-content: space-between; background: #030712; border: 1px solid #1e293b; padding: 0.5rem; border-radius: 0.5rem;";

    seatDiv.innerHTML = `
        <span style="font-size: 0.75rem; color: #cbd5e1; font-weight: 500;">
            👤 ${participant.username || "Unknown User"}
        </span>
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
    activeSocket.emit('place-bid', {
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
          <div id="profileTrigger" style="display: flex; align-items: center; gap: 0.5rem; background: #fdfdfd; border: 1px solid #334155; padding: 0.35rem 0.85rem; border-radius: 9999px; color: #01070e; font-size: 0.875rem; cursor: pointer;">
            <span style="background: #aaa8a4; color: #0f172adf; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">${userInitial}</span>
            <span style="font-weight: 500;">${user.username}</span>
          </div>

          <!-- Hover Dropdown Menu -->
          <div id="profileDropdown" style="display: none; position: absolute; right: 0; top: calc(100% + 8px); background: #fbfdff27; color: #f8fafc; border: 1px solid #334155; border-radius: 8px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.23); padding: 1rem; min-width: 200px; z-index: 1000;">
            <p style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.15rem; text-transform: uppercase; letter-spacing: 0.05em;">Signed in as</p>
            <p style="font-size: 0.85rem; font-weight: 600; margin-bottom: 0.75rem; word-break: break-all; color: #000000;">${user.email}</p>
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

function handleRoomSectionVisibility() {
  const roomSection = document.querySelector('.room-control-section');
  if (!roomSection) return;

  const token = localStorage.getItem('accessToken');
  if (!token) {
    roomSection.style.display = 'none';
  } else {
    roomSection.style.display = 'block';
  }
}


document.addEventListener("DOMContentLoaded", () => {
  renderHeaderAuth();
  handleRoomSectionVisibility();

  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const createRoomBtn = document.getElementById('createRoomBtn');
  const joinRoomBtn = document.getElementById('joinRoomBtn');

  if (createRoomBtn) {
    createRoomBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!checkAuthOrRedirect()) return;

      const roomNameInput = document.getElementById('quickRoomName');
      const roomName = roomNameInput ? roomNameInput.value.trim() : '';
      const accessToken = localStorage.getItem('accessToken');


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
          body: JSON.stringify({ name: roomName , hostId : currentUser.id , username : currentUser.username})
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
        window.location.href = `/room.html?roomId=${data.room._id}`;
        
      } catch (err) {
        console.error('Room creation error:', err);
        alert(`Failed to create room: ${err.message}`);
      }
    });
  }

  // 2. Secured Join Room Handler (Loads inside modal)
  if (joinRoomBtn) {
    joinRoomBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    if (!checkAuthOrRedirect()) return;

    const roomIdInput = document.getElementById('quickRoomId');
    const roomId = roomIdInput ? roomIdInput.value.trim() : '';

    if (!roomId) {
        alert('Please enter a valid Room ID.');
        return;
    }

    const accessToken = localStorage.getItem('accessToken');

    try {
        const response = await fetch(`/api/rooms/join/${roomId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                userId: currentUser.id,
                username: currentUser.username
            })
        });

        const data = await response.json();

        if (response.status === 401 || response.status === 403) {
            alert('Session expired. Please sign in again.');
            localStorage.clear();
            window.location.href = '/signin.html';
            return;
        }

        if (!response.ok) {
            throw new Error(data.error || 'Failed to join room.');
        }

        roomIdInput.value = '';
        window.location.href = `/room.html?roomId=${roomId}`;

      } catch (error) {
            console.error('Join room error:', error);
            alert(error.message || 'Failed to join room.');
        }
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
