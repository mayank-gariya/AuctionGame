document.addEventListener("DOMContentLoaded", () => {
  
  const signinForm = document.getElementById('signinForm');
  if (signinForm) {
    signinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value.trim();
      const messageEl = document.getElementById('signinMessage');

      messageEl.style.color = '#e11d48';
      messageEl.textContent = '';

      if (!email || !password) {
        messageEl.textContent = 'Please fill in all fields.';
        return;
      }

      try {
        const response = await fetch('/api/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to sign in.');
        }

        // Store access token & user profile in localStorage
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('currentUser', JSON.stringify(data.user));

        messageEl.style.color = '#16a34a';
        messageEl.textContent = 'Signed in successfully! Redirecting...';

        setTimeout(() => {
          window.location.href = '/';
        }, 1000);

      } catch (err) {
        messageEl.style.color = '#e11d48';
        messageEl.textContent = err.message;
      }
    });
  }
    
  // --- Sign Up Logic ---
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = document.getElementById('name').value.trim();
      const email = document.getElementById('signupEmail').value.trim();
      const password = document.getElementById('signupPassword').value.trim();
      const confirmPassword = document.getElementById('confirmPassword').value.trim();
      const messageEl = document.getElementById('signupMessage');

      messageEl.style.color = '#e11d48';
      messageEl.textContent = '';

      if (!username || !email || !password || !confirmPassword) {
        messageEl.textContent = 'Please fill in all fields.';
        return;
      }

      if (password !== confirmPassword) {
        messageEl.textContent = 'Passwords do not match.';
        return;
      }

      if (password.length < 6) {
        messageEl.textContent = 'Password must be at least 6 characters long.';
        return;
      }

      try {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create account.');
        }

        messageEl.style.color = '#16a34a';
        messageEl.textContent = 'Account created successfully! Redirecting to sign in...';

        setTimeout(() => {
          window.location.href = '/signin.html';
        }, 1200);

      } catch (err) {
        messageEl.style.color = '#e11d48';
        messageEl.textContent = err.message;
      }
    });
  }

});