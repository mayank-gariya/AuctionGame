document.addEventListener("DOMContentLoaded", () => {
  // Countdown timers
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

  // Temporary bid interaction.
  // Replace this later with your Node/Express POST request.
  document.querySelectorAll(".bid-button").forEach((button) => {
    button.addEventListener("click", () => {
      alert("Sign in to place a bid.");
      window.location.href = "/signin.html";
    });
  });
});
