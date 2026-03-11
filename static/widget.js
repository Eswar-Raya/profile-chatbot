(function () {
  "use strict";

  var script = document.currentScript;
  var apiUrl = (script && script.getAttribute("data-api-url")) || window.location.origin;
  apiUrl = apiUrl.replace(/\/$/, "");

  var root = document.createElement("div");
  root.id = "profile-chat-root";
  root.innerHTML =
    '<button type="button" id="profile-chat-toggle" aria-label="Ask about my profile">' +
    '<svg id="profile-chat-mascot" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="32" cy="18" r="10" fill="rgba(255,255,255,0.18)" stroke="currentColor"/>' +
    '<path d="M22 18c3-3 17-3 20 0" opacity="0.9"/>' +
    '<path d="M24 22h0" />' +
    '<path d="M40 22h0" />' +
    '<path d="M32 28c-3 0-6-2-6-2" opacity="0.85"/>' +
    '<path d="M32 28c3 0 6-2 6-2" opacity="0.85"/>' +
    '<path d="M32 28v2" opacity="0.6"/>' +
    '<path d="M32 28c0 4-4 6-8 6" opacity="0.6"/>' +
    '<path d="M32 28c0 4 4 6 8 6" opacity="0.6"/>' +
    '<path d="M32 28c0 6 0 10 0 14" />' +
    '<path d="M22 38c4-6 16-6 20 0" opacity="0.8"/>' +
    '<path d="M24 54c4-10 12-10 16 0" opacity="0.65"/>' +
    '<g id="profile-chat-mascot-arm" transform="translate(44,32)">' +
    '<path d="M0 0c6 2 10 6 12 10" />' +
    '<path d="M12 10l4-2" />' +
    '<path d="M12 10l2 4" />' +
    "</g>" +
    '<path d="M20 34c4 4 8 6 12 6" opacity="0.6"/>' +
    "</svg>" +
    "</button>" +
    '<div id="profile-chat-panel">' +
    '<div id="profile-chat-header">Ask about my profile <button type="button" id="profile-chat-close" aria-label="Close">×</button></div>' +
    '<div id="profile-chat-messages"></div>' +
    '<div id="profile-chat-suggestions" aria-label="Suggested actions"></div>' +
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
  var suggestionsEl = document.getElementById("profile-chat-suggestions");
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
    var html = escapeHtml(text);

    // Convert markdown links: [label](https://example.com)
    html = html.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      function (_, label, url) {
        return (
          '<a class="profile-chat-link" href="' +
          url +
          '" target="_blank" rel="noopener noreferrer">' +
          escapeHtml(label) +
          "</a>"
        );
      }
    );

    // Convert bare URLs into links
    html = html.replace(
      /(https?:\/\/[^\s<]+)/g,
      function (url) {
        return (
          '<a class="profile-chat-link" href="' +
          url +
          '" target="_blank" rel="noopener noreferrer">' +
          url +
          "</a>"
        );
      }
    );

    return html;
  }

  function addMessage(role, content, isThinking) {
    var div = document.createElement("div");
    div.className = "msg " + (isThinking ? "thinking" : role);
    if (role === "assistant" && !isThinking) {
      div.innerHTML = linkifySafe(content);
    } else {
      div.textContent = content;
    }
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function renderSuggestions() {
    if (!suggestionsEl) return;
    suggestionsEl.innerHTML = "";

    var items = [
      { type: "link", label: "Experience →", href: "https://eswarrayavarapu.com/experience" },
      { type: "link", label: "Programs →", href: "https://eswarrayavarapu.com/projects" },
      { type: "link", label: "Contact →", href: "https://eswarrayavarapu.com/contact" },
    ];

    items.forEach(function (item) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = item.label;
      btn.addEventListener("click", function () {
        if (item.type === "link") {
          window.open(item.href, "_blank", "noopener,noreferrer");
          return;
        }
        if (item.type === "ask") {
          input.value = item.text;
          form.requestSubmit();
        }
      });
      suggestionsEl.appendChild(btn);
    });
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

  renderSuggestions();

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
