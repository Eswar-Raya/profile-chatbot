(function () {
  "use strict";

  var script = document.currentScript;
  var apiUrl = (script && script.getAttribute("data-api-url")) || window.location.origin;
  apiUrl = apiUrl.replace(/\/$/, "");

  var root = document.createElement("div");
  root.id = "profile-chat-root";
  root.innerHTML =
    '<button type="button" id="profile-chat-toggle" aria-label="Open chat">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
    "</button>" +
    '<div id="profile-chat-panel">' +
    '<div id="profile-chat-header">Ask about my profile <button type="button" id="profile-chat-close" aria-label="Close">×</button></div>' +
    '<div id="profile-chat-messages"></div>' +
    '<div id="profile-chat-input-wrap">' +
    '<form id="profile-chat-input-form">' +
    '<textarea id="profile-chat-input" rows="1" placeholder="Ask anything about my profile..." autocomplete="off"></textarea>' +
    '<button type="submit" id="profile-chat-send" aria-label="Send">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7L22 2z"/></svg>' +
    "</button>" +
    "</form>" +
    "</div>" +
    "</div>";
  document.body.appendChild(root);

  var link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = apiUrl + "/widget.css";
  document.head.appendChild(link);

  var panel = document.getElementById("profile-chat-panel");
  var toggle = document.getElementById("profile-chat-toggle");
  var closeBtn = document.getElementById("profile-chat-close");
  var messagesEl = document.getElementById("profile-chat-messages");
  var form = document.getElementById("profile-chat-input-form");
  var input = document.getElementById("profile-chat-input");
  var sendBtn = document.getElementById("profile-chat-send");

  var history = [];

  function open() {
    root.classList.add("open");
  }
  function close() {
    root.classList.remove("open");
  }
  toggle.addEventListener("click", function () {
    root.classList.toggle("open");
  });
  closeBtn.addEventListener("click", close);

  function addMessage(role, content, isThinking) {
    var div = document.createElement("div");
    div.className = "msg " + (isThinking ? "thinking" : role);
    div.textContent = content;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function setThinking(show) {
    sendBtn.disabled = show;
    var el = document.getElementById("profile-chat-thinking");
    if (el) el.remove();
    if (show) {
      var thinking = document.createElement("div");
      thinking.id = "profile-chat-thinking";
      thinking.className = "msg thinking";
      thinking.textContent = "Thinking...";
      messagesEl.appendChild(thinking);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = (input.value || "").trim();
    if (!text) return;
    input.value = "";
    addMessage("user", text);
    history.push({ role: "user", content: text });
    setThinking(true);

    fetch(apiUrl + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history: history.slice(0, -1) }),
    })
      .then(function (res) {
        if (!res.ok) return res.json().then(function (err) { throw new Error(err.detail || res.statusText); });
        return res.json();
      })
      .then(function (data) {
        setThinking(false);
        var reply = data.reply || "";
        history.push({ role: "assistant", content: reply });
        addMessage("assistant", reply);
      })
      .catch(function (err) {
        setThinking(false);
        history.push({ role: "assistant", content: "Sorry, something went wrong. Please try again." });
        addMessage("assistant", "Sorry, something went wrong. " + (err.message || "Please try again."));
      });
  });

  /* Auto-resize textarea */
  input.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 120) + "px";
  });
})();
