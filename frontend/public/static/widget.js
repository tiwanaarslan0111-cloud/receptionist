/**
 * Multi-Tenant AI Booking Receptionist - Embeddable Web Widget
 * Version: 2.0.0 (Zero Dependencies, Shadow DOM Encapsulated)
 */
(function () {
  "use strict";

  if (window.__AutoReceptionistWidgetInitialized) return;
  window.__AutoReceptionistWidgetInitialized = true;

  // ==================== 1. TOKEN & API EXTRACTION ====================
  const scriptTag =
    document.currentScript ||
    document.querySelector("script[data-token]") ||
    document.querySelector('script[src*="widget.js"]');

  const widgetToken = scriptTag ? scriptTag.getAttribute("data-token") : null;

  if (!widgetToken) {
    console.error(
      "[AI Receptionist Widget] Missing required data-token attribute. Example: <script src=\".../widget.js\" data-token=\"YOUR_TOKEN\" defer></script>"
    );
    return;
  }

  let apiBase = scriptTag.getAttribute("data-api") || "";
  if (!apiBase) {
    try {
      if (scriptTag.src && scriptTag.src.startsWith("http")) {
        const parsed = new URL(scriptTag.src);
        apiBase = `${parsed.protocol}//${parsed.host}`;
      } else if (window.location.hostname && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        apiBase = window.location.origin;
      } else {
        apiBase = "https://receptionist.helpexai.com";
      }
    } catch {
      apiBase = "https://receptionist.helpexai.com";
    }
  }
  // Fallback to production domain if not on localhost
  if (!apiBase || apiBase === "null" || (apiBase.includes("127.0.0.1") && typeof window !== "undefined" && window.location.hostname && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1")) {
    apiBase = "https://receptionist.helpexai.com";
  }
  // Remove trailing slash if present
  apiBase = apiBase.replace(/\/+$/, "");

  // ==================== 2. SESSION MANAGEMENT ====================
  let sessionId = sessionStorage.getItem("receptionist_session_id");
  if (!sessionId) {
    sessionId = "sess_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
    sessionStorage.setItem("receptionist_session_id", sessionId);
  }

  // State
  let currentAudio = null;
  let isChatOpen = false;
  let isRecording = false;
  let isAudioMuted = false;
  let recognition = null;
  let currentPlayingBubble = null;

  // ==================== 3. SHADOW DOM CREATION ====================
  const rootHost = document.createElement("div");
  rootHost.id = "ai-receptionist-root";
  document.body.appendChild(rootHost);

  const shadow = rootHost.attachShadow({ mode: "open" });

  // Encapsulated CSS
  const style = document.createElement("style");
  style.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    /* Floating Action Button (FAB) */
    .widget-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.5), 0 8px 10px -6px rgba(99, 102, 241, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border: none;
      color: #ffffff;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      z-index: 2147483647;
      outline: none;
    }
    .widget-fab:hover {
      transform: scale(1.08) translateY(-2px);
      box-shadow: 0 15px 30px -5px rgba(99, 102, 241, 0.6), 0 10px 12px -5px rgba(99, 102, 241, 0.4);
    }
    .widget-fab:active {
      transform: scale(0.95);
    }
    .fab-icon-chat, .fab-icon-close {
      transition: all 0.25s ease;
      position: absolute;
    }
    .fab-icon-close {
      opacity: 0;
      transform: rotate(-90deg) scale(0.6);
    }
    .widget-fab.open .fab-icon-chat {
      opacity: 0;
      transform: rotate(90deg) scale(0.6);
    }
    .widget-fab.open .fab-icon-close {
      opacity: 1;
      transform: rotate(0) scale(1);
    }

    /* Pulse Notification Dot */
    .fab-pulse-dot {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 14px;
      height: 14px;
      background: #10b981;
      border-radius: 50%;
      border: 2px solid #ffffff;
    }
    .fab-pulse-ring {
      position: absolute;
      top: 0;
      right: 0;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #10b981;
      opacity: 0.75;
      animation: fab-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
    }
    @keyframes fab-ping {
      75%, 100% {
        transform: scale(2);
        opacity: 0;
      }
    }

    /* Chat Window Container */
    .widget-window {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 380px;
      height: 560px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 120px);
      background: #0f172a;
      border-radius: 16px;
      box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 2147483646;
      opacity: 0;
      transform: translateY(20px) scale(0.96);
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .widget-window.open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    /* Window Header */
    .widget-header {
      padding: 16px;
      background: #1e293b;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .header-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-avatar {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      position: relative;
    }
    .header-online-dot {
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #10b981;
      border: 2px solid #1e293b;
    }
    .header-titles {
      display: flex;
      flex-direction: column;
    }
    .header-title {
      font-size: 14px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.2;
    }
    .header-subtitle {
      font-size: 11px;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 2px;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .header-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .header-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
    }

    /* Messages History */
    .widget-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #0b1120;
    }
    .widget-messages::-webkit-scrollbar {
      width: 4px;
    }
    .widget-messages::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 2px;
    }

    /* Message Bubbles */
    .msg-row {
      display: flex;
      width: 100%;
    }
    .msg-row-user {
      justify-content: flex-end;
    }
    .msg-row-bot {
      justify-content: flex-start;
    }
    .msg-bubble {
      max-width: 82%;
      padding: 11px 14px;
      border-radius: 14px;
      font-size: 13px;
      line-height: 1.5;
      word-break: break-word;
      position: relative;
    }
    .msg-user {
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: #ffffff;
      border-bottom-right-radius: 4px;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
    }
    .msg-bot {
      background: #1e293b;
      color: #f1f5f9;
      border-bottom-left-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    /* Sound wave animation on bot bubble */
    .sound-wave {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      height: 14px;
      margin-left: 6px;
      vertical-align: middle;
    }
    .sound-wave-bar {
      width: 3px;
      height: 100%;
      background: #818cf8;
      border-radius: 2px;
      animation: sound-bar-wave 1s ease-in-out infinite alternate;
    }
    .sound-wave-bar:nth-child(1) { animation-delay: 0.1s; height: 40%; }
    .sound-wave-bar:nth-child(2) { animation-delay: 0.3s; height: 90%; }
    .sound-wave-bar:nth-child(3) { animation-delay: 0.2s; height: 60%; }
    @keyframes sound-bar-wave {
      0% { height: 20%; }
      100% { height: 100%; }
    }

    /* Typing Indicator */
    .msg-typing {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 12px 16px;
      background: #1e293b;
      border-radius: 14px;
      border-bottom-left-radius: 4px;
      width: fit-content;
    }
    .typing-dot {
      width: 6px;
      height: 6px;
      background: #94a3b8;
      border-radius: 50%;
      animation: typing-bounce 1.4s infinite ease-in-out both;
    }
    .typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .typing-dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes typing-bounce {
      0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
      40% { transform: scale(1); opacity: 1; }
    }

    /* Input Bar */
    .widget-input-bar {
      padding: 12px 14px;
      background: #1e293b;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .widget-input {
      flex: 1;
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 9px 13px;
      font-size: 13px;
      color: #ffffff;
      outline: none;
      transition: border-color 0.2s;
    }
    .widget-input:focus {
      border-color: #6366f1;
    }
    .widget-input::placeholder {
      color: #64748b;
    }

    /* Action Buttons (Mic, Send) */
    .btn-action {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
    }
    .btn-mic {
      background: #0f172a;
      color: #94a3b8;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .btn-mic:hover {
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.2);
    }
    .btn-mic.recording {
      background: #ef4444;
      color: #ffffff;
      animation: mic-pulse 1.2s infinite;
    }
    @keyframes mic-pulse {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }
    .btn-send {
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: #ffffff;
    }
    .btn-send:hover {
      opacity: 0.92;
      transform: translateY(-1px);
    }
    .btn-send:active {
      transform: translateY(0);
    }
    .btn-send:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none;
    }

    /* Responsive adjustments for mobile screens */
    @media (max-width: 480px) {
      .widget-window {
        bottom: 0;
        right: 0;
        width: 100vw;
        height: 100vh;
        max-width: 100vw;
        max-height: 100vh;
        border-radius: 0;
      }
      .widget-fab {
        bottom: 16px;
        right: 16px;
      }
    }
  `;
  shadow.appendChild(style);

  // Template HTML
  const template = document.createElement("div");
  template.innerHTML = `
    <!-- Hidden Audio Player -->
    <audio id="ai-audio-player" style="display:none;"></audio>

    <!-- Floating Action Button -->
    <button class="widget-fab" id="ai-fab" aria-label="Open AI Receptionist">
      <span class="fab-pulse-ring"></span>
      <span class="fab-pulse-dot"></span>
      <svg class="fab-icon-chat" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <svg class="fab-icon-close" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>

    <!-- Chat Modal Window -->
    <div class="widget-window" id="ai-window">
      <!-- Header -->
      <div class="widget-header">
        <div class="header-info">
          <div class="header-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path>
              <rect x="3" y="8" width="18" height="12" rx="4"></rect>
              <circle cx="9" cy="13" r="1.5"></circle>
              <circle cx="15" cy="13" r="1.5"></circle>
            </svg>
            <span class="header-online-dot"></span>
          </div>
          <div class="header-titles">
            <span class="header-title">AI Receptionist</span>
            <span class="header-subtitle">
              <span>●</span> Online • English & Urdu (اردو)
            </span>
          </div>
        </div>

        <div class="header-actions">
          <button class="header-btn" id="ai-sound-btn" title="Toggle Voice Response">
            <svg id="ai-sound-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          </button>
          <button class="header-btn" id="ai-close-btn" title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <!-- Messages Pane -->
      <div class="widget-messages" id="ai-messages">
        <div class="msg-row msg-row-bot">
          <div class="msg-bubble msg-bot">
            Assalam-o-Alaikum! Hello! I am your AI receptionist. How can I assist you with appointments or reservations today?
          </div>
        </div>
      </div>

      <!-- Input Bar -->
      <form class="widget-input-bar" id="ai-form">
        <button type="button" class="btn-action btn-mic" id="ai-mic-btn" title="Speak via Voice (Urdu / English)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="22"></line>
          </svg>
        </button>
        <input class="widget-input" id="ai-input" placeholder="Type or speak your request..." autocomplete="off" />
        <button type="submit" class="btn-action btn-send" id="ai-send-btn" title="Send Message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </form>
    </div>
  `;
  shadow.appendChild(template);

  // ==================== 4. DOM REFERENCES ====================
  const fab = shadow.getElementById("ai-fab");
  const win = shadow.getElementById("ai-window");
  const closeBtn = shadow.getElementById("ai-close-btn");
  const soundBtn = shadow.getElementById("ai-sound-btn");
  const soundIcon = shadow.getElementById("ai-sound-icon");
  const form = shadow.getElementById("ai-form");
  const input = shadow.getElementById("ai-input");
  const micBtn = shadow.getElementById("ai-mic-btn");
  const sendBtn = shadow.getElementById("ai-send-btn");
  const messagesPane = shadow.getElementById("ai-messages");
  const audioPlayer = shadow.getElementById("ai-audio-player");

  // ==================== 5. EVENT HANDLERS ====================
  function toggleChat() {
    isChatOpen = !isChatOpen;
    fab.classList.toggle("open", isChatOpen);
    win.classList.toggle("open", isChatOpen);
    if (!isChatOpen) {
      stopActiveAudio();
    } else {
      input.focus();
      scrollToBottom();
    }
  }

  fab.addEventListener("click", toggleChat);
  closeBtn.addEventListener("click", toggleChat);

  // Mute / Unmute Toggle
  soundBtn.addEventListener("click", () => {
    isAudioMuted = !isAudioMuted;
    if (isAudioMuted) {
      stopActiveAudio();
      soundIcon.innerHTML = `
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <line x1="23" y1="9" x2="17" y2="15"></line>
        <line x1="17" y1="9" x2="23" y2="15"></line>
      `;
      soundBtn.style.color = "#ef4444";
    } else {
      soundIcon.innerHTML = `
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      `;
      soundBtn.style.color = "#94a3b8";
    }
  });

  function scrollToBottom() {
    requestAnimationFrame(() => {
      try {
        messagesPane.scrollTo({
          top: messagesPane.scrollHeight,
          behavior: "smooth",
        });
      } catch {
        messagesPane.scrollTop = messagesPane.scrollHeight;
      }
    });
  }

  function appendMessage(text, role) {
    const row = document.createElement("div");
    row.className = `msg-row msg-row-${role}`;

    const bubble = document.createElement("div");
    bubble.className = `msg-bubble msg-${role}`;
    bubble.innerText = text;

    row.appendChild(bubble);
    messagesPane.appendChild(row);
    scrollToBottom();
    return bubble;
  }

  function showTypingIndicator() {
    const row = document.createElement("div");
    row.className = "msg-row msg-row-bot";
    row.id = "ai-typing-indicator";

    const typing = document.createElement("div");
    typing.className = "msg-typing";
    typing.innerHTML = `
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    `;

    row.appendChild(typing);
    messagesPane.appendChild(row);
    scrollToBottom();
  }

  function hideTypingIndicator() {
    const typing = shadow.getElementById("ai-typing-indicator");
    if (typing) typing.remove();
  }

  // ==================== 6. AUDIO & BARGE-IN INTERRUPTION ====================
  function stopActiveAudio() {
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch (e) {
        console.warn("[AI Receptionist Widget] Error stopping audio:", e);
      }
      currentAudio = null;
    }
    stopSoundWave();
  }

  function startSoundWave(bubble) {
    stopSoundWave();
    currentPlayingBubble = bubble;
    bubble.classList.add("soundwave-active");
    const wave = document.createElement("span");
    wave.className = "sound-wave";
    wave.id = "active-sound-wave";
    wave.innerHTML = `
      <span class="sound-wave-bar"></span>
      <span class="sound-wave-bar"></span>
      <span class="sound-wave-bar"></span>
    `;
    bubble.appendChild(wave);
  }

  function stopSoundWave() {
    const activeWave = shadow.getElementById("active-sound-wave");
    if (activeWave) activeWave.remove();
    if (currentPlayingBubble) {
      currentPlayingBubble.classList.remove("soundwave-active");
      currentPlayingBubble = null;
    }
    const waves = shadow.querySelectorAll(".soundwave-active");
    waves.forEach((w) => w.classList.remove("soundwave-active"));
  }

  function playAudioResponse(audioUrl, bubble) {
    stopActiveAudio(); // Clear any lingering playback before playing new audio
    if (isAudioMuted || !audioUrl) return;

    try {
      const fullUrl = audioUrl.startsWith("http") ? audioUrl : `${apiBase}${audioUrl}`;
      currentAudio = new Audio(fullUrl);

      currentAudio.onplay = () => {
        if (bubble) startSoundWave(bubble);
      };

      currentAudio.onended = () => {
        stopActiveAudio();
      };

      currentAudio.onerror = () => {
        // Fallback: If /static failed, try /api/static (accessible via standard Nginx /api/ proxy)
        if (fullUrl.includes("/static/") && !fullUrl.includes("/api/static/")) {
          const fallbackUrl = fullUrl.replace("/static/", "/api/static/");
          currentAudio = new Audio(fallbackUrl);
          currentAudio.onplay = () => { if (bubble) startSoundWave(bubble); };
          currentAudio.onended = () => { stopActiveAudio(); };
          currentAudio.onerror = () => { stopActiveAudio(); };
          const p = currentAudio.play();
          if (p !== undefined) {
            p.catch(() => stopActiveAudio());
          }
          return;
        }
        stopActiveAudio();
      };

      const playPromise = currentAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("[AI Receptionist Widget] Autoplay blocked or interrupted:", err);
          stopActiveAudio();
        });
      }
    } catch (e) {
      console.error("[AI Receptionist Widget] Audio playback error:", e);
      stopActiveAudio();
    }
  }

  // ==================== 7. SPEECH-TO-TEXT (STT) ====================
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition || null;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "ur-PK";

    recognition.onstart = () => {
      stopActiveAudio(); // Barge-in: Interrupt audio immediately when user starts speaking
      isRecording = true;
      micBtn.classList.add("recording");
      input.placeholder = "Listening in Urdu / English...";
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript && transcript.trim()) {
        input.value = transcript.trim();
        submitMessage(transcript.trim());
      }
    };

    recognition.onerror = (event) => {
      console.warn("[AI Receptionist Widget] Speech Recognition error:", event.error);
      if (event.error === "language-not-supported" && recognition.lang !== "en-US") {
        console.info("[AI Receptionist Widget] Falling back to en-US speech recognition.");
        recognition.lang = "en-US";
        try {
          recognition.start();
          return;
        } catch {}
      }
      stopRecording();
    };

    recognition.onend = () => {
      stopRecording();
    };
  }

  function stopRecording() {
    isRecording = false;
    micBtn.classList.remove("recording");
    input.placeholder = "Type or speak your request...";
  }

  micBtn.addEventListener("click", () => {
    stopActiveAudio(); // Barge-in: Interrupt audio immediately on mic click
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }
    if (isRecording) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (err) {
        recognition.stop();
      }
    }
  });

  // ==================== 8. NETWORK & CHAT PIPELINE ====================
  async function submitMessage(messageText) {
    if (!messageText || !messageText.trim()) return;

    stopActiveAudio(); // Barge-in: Cancel ongoing speech immediately when a new message is submitted

    appendMessage(messageText, "user");
    input.value = "";
    sendBtn.disabled = true;
    showTypingIndicator();

    try {
      const response = await fetch(`${apiBase}/api/widget/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-widget-token": widgetToken,
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: messageText,
        }),
      });

      hideTypingIndicator();

      if (!response.ok) {
        let errMsg = "Unable to process request right now.";
        try {
          const errData = await response.json();
          if (errData && errData.detail) errMsg = errData.detail;
        } catch {}
        appendMessage(`Error: ${errMsg}`, "bot");
      } else {
        const data = await response.json();
        const botBubble = appendMessage(data.text, "bot");
        if (data.audio_url) {
          playAudioResponse(data.audio_url, botBubble);
        }
      }
    } catch (networkError) {
      hideTypingIndicator();
      appendMessage("Network connection error. Please verify your connection and try again.", "bot");
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (text) {
      submitMessage(text);
    }
  });
})();
