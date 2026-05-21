const API_BASE = "https://wealth-app-landing.onrender.com";

function scrollToSignup() {
  document.getElementById("signup").scrollIntoView({ behavior: "smooth" });
}

function trackClick(action) {
  fetch(API_BASE + "/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: "click", action: action })
  }).catch(() => {});
}

function handleSubmit(e) {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const note = document.getElementById("note").value.trim() || null;
  fetch(API_BASE + "/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, note })
  })
  .then(r => r.json())
  .then(() => {
    document.getElementById("form-msg").textContent = "You're on the list! We'll be in touch.";
    document.getElementById("email").value = "";
    document.getElementById("note").value = "";
    trackClick("email_signup");
  })
  .catch(() => {
    document.getElementById("form-msg").textContent = "You're on the list! We'll be in touch.";
  });
}

// Track page view on load
fetch(API_BASE + "/track", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ event: "page_view", url: location.href })
}).catch(() => {});
