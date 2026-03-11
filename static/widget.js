(function () {
  "use strict";

  var script = document.currentScript;
  var apiUrl = (script && script.getAttribute("data-api-url")) || window.location.origin;
  apiUrl = apiUrl.replace(/\/$/, "");

  var root = document.createElement("div");
  root.id = "profile-chat-root";
  root.innerHTML =
    '<button type="button" id="profile-chat-toggle" aria-label="Ask about my profile">' +
    '<svg id="profile-chat-mascot" viewBox="0 0 72 72" aria-hidden="true">' +
    '<defs>' +
    '<linearGradient id="pc-helmet" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#FFFFFF"/>' +
    '<stop offset="1" stop-color="#DDE7F6"/>' +
    "</linearGradient>" +
    '<linearGradient id="pc-hoodie" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#2E4F82"/>' +
    '<stop offset="1" stop-color="#142F54"/>' +
    "</linearGradient>" +
    "</defs>" +
    '<g fill="none" stroke="none">' +
    '<g id="pc-bot-float">' +
    '<path d="M14 32c4-16 16-24 22-24h0c6 0 18 8 22 24" fill="url(#pc-hoodie)" opacity="0.95"/>' +
    '<path d="M18 34c3-11 12-18 18-18s15 7 18 18" fill="rgba(255,255,255,0.08)"/>' +
    '<circle cx="36" cy="34" r="16" fill="url(#pc-helmet)"/>' +
    '<circle cx="36" cy="34" r="16" fill="none" stroke="rgba(20,47,84,0.25)" stroke-width="2"/>' +
    '<rect x="24" y="28" width="24" height="14" rx="7" fill="#0B1D35" opacity="0.95"/>' +
    '<circle id="pc-eye-left" cx="31" cy="35" r="3.6" fill="#7DD3FC"/>' +
    '<circle id="pc-eye-right" cx="41" cy="35" r="3.6" fill="#7DD3FC"/>' +
    '<circle cx="30" cy="33.8" r="1.1" fill="#FFFFFF" opacity="0.9"/>' +
    '<circle cx="40" cy="33.8" r="1.1" fill="#FFFFFF" opacity="0.9"/>' +
    '<path d="M33 41c2 2 4 2 6 0" stroke="#CFE0F5" stroke-width="2" stroke-linecap="round"/>' +
    '<g id="pc-arm-wave" transform="translate(54,42)">' +
    '<path d="M0 0c5 2 10 6 12 11" stroke="#EAF0F7" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M12 11l5-2" stroke="#EAF0F7" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M12 11l2 5" stroke="#EAF0F7" stroke-width="3" stroke-linecap="round"/>' +
    "</g>" +
    '<path d="M22 54c4-10 24-10 28 0" fill="rgba(255,255,255,0.10)"/>' +
    '<g id="pc-hi-bubble" transform="translate(46,8)">' +
    '<path d="M0 10c0-5 4-10 10-10h10c6 0 10 5 10 10v4c0 6-4 10-10 10h-6l-6 6v-6H10C4 24 0 20 0 14v-4z" fill="rgba(255,255,255,0.92)"/>' +
    '<path d="M10 8v8" stroke="#142F54" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M10 12h4" stroke="#142F54" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M20 8v8" stroke="#142F54" stroke-width="3" stroke-linecap="round"/>' +
    "</g>" +
    "</g>" +
    "</g>" +
    "</svg>" +
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

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function linkifySafe(text) {
    var raw = String(text || "");

    // Some model outputs accidentally paste anchor attributes. Strip the common pattern.
    raw = raw.replace(/"\s*target="_blank"\s*rel="noopener noreferrer">\s*/g, " ");

    var out = "";
    var re =
      /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s<">)]+)/g;
    var lastIndex = 0;
    var match;
    while ((match = re.exec(raw)) !== null) {
      out += escapeHtml(raw.slice(lastIndex, match.index));
      if (match[3]) {
        var label = match[2] || match[3];
        var url1 = match[3];
        out +=
          '<a class="profile-chat-link" href="' +
          escapeHtml(url1) +
          '" target="_blank" rel="noopener noreferrer">' +
          escapeHtml(label) +
          "</a>";
      } else if (match[4]) {
        var url2 = match[4];
        out +=
          '<a class="profile-chat-link" href="' +
          escapeHtml(url2) +
          '" target="_blank" rel="noopener noreferrer">' +
          escapeHtml(url2) +
          "</a>";
      }
      lastIndex = re.lastIndex;
    }
    out += escapeHtml(raw.slice(lastIndex));
    return out;
  }

  function mascotSvgMarkup() {
    return (
      '<svg viewBox="0 0 72 72" aria-hidden="true">' +
      '<defs>' +
      '<linearGradient id="pc-helmet-mini" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#FFFFFF"/>' +
      '<stop offset="1" stop-color="#DDE7F6"/>' +
      "</linearGradient>" +
      '<linearGradient id="pc-hoodie-mini" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#2E4F82"/>' +
      '<stop offset="1" stop-color="#142F54"/>' +
      "</linearGradient>" +
      "</defs>" +
      '<g fill="none" stroke="none">' +
      '<path d="M16 36c3-12 12-18 16-18h0c4 0 13 6 16 18" fill="url(#pc-hoodie-mini)" opacity="0.95"/>' +
      '<circle cx="36" cy="36" r="14" fill="url(#pc-helmet-mini)"/>' +
      '<rect x="26" y="31" width="20" height="12" rx="6" fill="#0B1D35" opacity="0.95"/>' +
      '<circle cx="32" cy="37" r="3" fill="#7DD3FC"/>' +
      '<circle cx="40" cy="37" r="3" fill="#7DD3FC"/>' +
      "</g></svg>"
    );
  }

  function addMessage(role, content, isThinking) {
    var div = document.createElement("div");
    div.className = "msg " + (isThinking ? "thinking" : role);
    if (role === "assistant" && !isThinking) {
      div.classList.add("with-avatar");
      div.innerHTML =
        '<span class="avatar" aria-hidden="true">' +
        mascotSvgMarkup() +
        "</span>" +
        '<span class="bubble">' +
        linkifySafe(content) +
        "</span>";
    } else {
      div.textContent = content;
    }
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

  /* Enter sends message; Shift+Enter adds new line */
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  /* Auto-resize textarea */
  input.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 120) + "px";
  });
})();
