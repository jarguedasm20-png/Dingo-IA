const assetVersion = "2026-05-11-debug-pass";

function avatarPath(fileName) {
  return `assets/${fileName}?v=${assetVersion}`;
}

const states = {
  idle: {
    label: "Idle",
    image: avatarPath("dingo-idle-dog.png"),
  },
  greeting: {
    label: "Greeting",
    image: avatarPath("dingo-greeting-dog.png"),
  },
  listening: {
    label: "Listening",
    image: avatarPath("dingo-listening-dog.png"),
  },
  thinking: {
    label: "Thinking",
    image: avatarPath("dingo-thinking-dog.png"),
  },
  typing: {
    label: "Typing / Responding",
    image: avatarPath("dingo-typing-dog.png"),
  },
  excited: {
    label: "Excited / Priority",
    image: avatarPath("dingo-excited-dog.png"),
  },
  confused: {
    label: "Confused",
    image: avatarPath("dingo-confused-dog.png"),
  },
  success: {
    label: "Success / Confirmed",
    image: avatarPath("dingo-success-dog.png"),
  },
};

const avatarCache = new Map();

function preloadAvatarStates() {
  Object.values(states).forEach((state) => {
    if (avatarCache.has(state.image)) {
      return;
    }

    const image = new Image();
    image.decoding = "async";
    image.src = state.image;
    avatarCache.set(state.image, image);
  });
}

window.setTimeout(preloadAvatarStates, 180);

const widget = document.querySelector(".dingo-widget");
const bubble = document.querySelector("#dingoBubble");
const panel = document.querySelector("#chatPanel");
const closeChat = document.querySelector("#closeChat");
const backToStart = document.querySelector("#backToStart");
const avatar = document.querySelector("#dingoAvatar");
const headerAvatar = document.querySelector("#headerAvatar");
const stateLabel = document.querySelector("#stateLabel");
const messages = document.querySelector("#chatMessages");
const form = document.querySelector("#chatForm");
const input = document.querySelector("#chatInput");
const quickActions = document.querySelectorAll("[data-prompt]");
const notificationDot = document.querySelector("#notificationDot");
const contextNudge = document.querySelector("#contextNudge");
const startHint = document.querySelector("#startHint");
const contactUsButton = document.querySelector("#contactUsButton");
const contactMenu = document.querySelector("#contactMenu");
const scheduleFromContact = document.querySelector("#scheduleFromContact");
const projectPopover = document.querySelector("#projectPopover");
const projectPopoverClose = document.querySelector("#projectPopoverClose");
const projectPopoverForm = document.querySelector("#projectPopoverForm");
const projectPopoverInput = document.querySelector("#projectPopoverInput");
const openCostCalculator = document.querySelector("#openCostCalculator");
const costCalculator = document.querySelector("#costCalculator");
const closeCostCalculator = document.querySelector("#closeCostCalculator");
const costArea = document.querySelector("#costArea");
const costUnit = document.querySelector("#costUnit");
const costCategory = document.querySelector("#costCategory");
const costResult = document.querySelector("#costResult");
const meetingDurationMinutes = 90;
// Saturday video-call schedule. Each booking lasts 90 minutes.
const meetingSlots = [
  { label: "7:00 AM", value: "07:00" },
  { label: "8:30 AM", value: "08:30" },
  { label: "10:00 AM", value: "10:00" },
  { label: "1:00 PM", value: "13:00" },
  { label: "2:30 PM", value: "14:30" },
  { label: "3:30 PM", value: "15:30" },
];
const bookingsKey = "monark-dingo-video-call-bookings";
const projectLeadsKey = "monark-dingo-project-leads";
const metricsKey = "monark-dingo-internal-events";
const aiConfig = {
  // AI calls go through the local backend so Gemini credentials never live in the browser.
  endpoint: "/api/ai",
  provider: "gemini",
};
const infoNudges = [
  "Planning to build in Costa Rica? Dingo can help you organize your first questions.",
  "Have design doubts? I can help you think through style, materials, and next steps.",
  "Building remotely? Ask Dingo how to prepare for a Monark video call.",
  "Need a starting point? Tell Dingo about your land, budget, timeline, or design goals.",
];

let stateTimer;
let moodTimer;
let moodIndex = 0;
let moodTransitionTimer;
let queuedMoodState;
let queuedMoodTimer;
let lastMoodChangeTime = 0;
let projectPopoverShown = false;
let infoNudgeIndex = 0;
let infoNudgeTimer;
let infoNudgeHideTimer;
let sessionBookings = [];
let sessionProjectLeads = [];
let sessionMetrics = [];
let sessionConversation = [];
let isUserTyping = false;
let audioContext;
let audioUnlocked = false;
let soundMuted = false;

function enterConversationMode() {
  panel.classList.add("conversation-mode");
  contactMenu?.classList.remove("open");
}

function isDingoAppActive() {
  return (
    panel.classList.contains("open") ||
    widget.classList.contains("calculator-open") ||
    contactMenu?.classList.contains("open")
  );
}

function hideContextNudge(immediate = false) {
  window.clearTimeout(infoNudgeHideTimer);

  if (!contextNudge.classList.contains("visible")) {
    return;
  }

  if (immediate) {
    contextNudge.classList.remove("visible", "sweeping");
    contextNudge.textContent = "";
    return;
  }

  contextNudge.classList.add("sweeping");
  window.setTimeout(() => {
    contextNudge.classList.remove("visible", "sweeping");
    contextNudge.textContent = "";
  }, 540);
}

function showStartOptions() {
  panel.classList.remove("conversation-mode");
  messages.scrollTop = 0;
  input.value = "";
  input.blur();
  stopMoodLoop();
  isUserTyping = false;
  setState("greeting");
  scheduleState("listening", 1200);
  trackDingoEvent("start_options_viewed");
}

function formatUsd(value) {
  return `US$${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function updateCostEstimate() {
  if (!costArea || !costUnit || !costCategory || !costResult) {
    return;
  }

  const area = Number(String(costArea.value).replace(",", "."));
  const areaInSquareMeters = costUnit.value === "sqft" ? area * 0.092903 : area;
  const category = costCategory.value;

  if (!Number.isFinite(area) || area <= 0) {
    costResult.textContent = "Enter the area and select a category.";
    return;
  }

  if (category === "premium") {
    costResult.innerHTML = `
      <p>Premium projects are custom made. To estimate the right cost, finishes, design, materials, and specific project variations must be reviewed first.</p>
      <p>We recommend scheduling a video call with Monark's Architect and Engineer.</p>
      <button class="cost-schedule-button" type="button">Schedule a video call</button>
    `;
    return;
  }

  const rates =
    category === "basic"
      ? { min: 1600, max: 1800 }
      : { min: 1800, max: 2400 };

  costResult.textContent = `Approximate cost: ${formatUsd(areaInSquareMeters * rates.min)} – ${formatUsd(
    areaInSquareMeters * rates.max,
  )}`;
}

function openCalculator() {
  panel.classList.remove("open");
  panel.classList.remove("conversation-mode");
  projectPopover?.classList.remove("visible");
  contactMenu?.classList.remove("open");
  hideContextNudge(true);
  widget.classList.add("calculator-open");
  setState("thinking", { decisive: true });
  playSound("open");
  updateCostEstimate();
  window.setTimeout(() => costArea?.focus(), 220);
  trackDingoEvent("cost_calculator_opened");
}

function closeCalculator() {
  widget.classList.remove("calculator-open");
  setState("idle", { decisive: true });
  playSound("soft");
  trackDingoEvent("cost_calculator_closed");
}

// Fresh page policy: remove old local history so every page load starts clean.
try {
  localStorage.removeItem(bookingsKey);
  localStorage.removeItem(projectLeadsKey);
  localStorage.removeItem(metricsKey);
} catch (error) {
  console.info("Dingo storage reset skipped", error);
}

// Internal metrics stub: stores events locally now, ready to forward to GA or another tool later.
function trackDingoEvent(name, details = {}) {
  const event = {
    name,
    details,
    timestamp: new Date().toISOString(),
  };

  sessionMetrics.push(event);
  sessionMetrics = sessionMetrics.slice(-100);
}

function unlockAudio() {
  if (audioUnlocked) {
    return;
  }

  const AudioContext = window.AudioContext || window.webkitAudioContext;

  if (!AudioContext) {
    soundMuted = true;
    return;
  }

  audioContext = audioContext || new AudioContext();

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  audioUnlocked = true;
}

function playTone(frequency, startTime, duration, gainValue, type = "sine") {
  if (!audioContext || soundMuted) {
    return;
  }

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

function playSound(name) {
  if (!audioUnlocked || !audioContext || soundMuted) {
    return;
  }

  const now = audioContext.currentTime;
  const volume = 0.035;

  if (name === "open") {
    playTone(392, now, 0.09, volume);
    playTone(523.25, now + 0.08, 0.12, volume * 0.9);
  } else if (name === "reply") {
    playTone(659.25, now, 0.08, volume * 0.65);
  } else if (name === "success") {
    playTone(523.25, now, 0.08, volume);
    playTone(659.25, now + 0.075, 0.08, volume);
    playTone(783.99, now + 0.15, 0.13, volume * 0.85);
  } else if (name === "nudge") {
    playTone(329.63, now, 0.1, volume * 0.5, "triangle");
  } else if (name === "soft") {
    playTone(440, now, 0.07, volume * 0.45, "triangle");
  }
}

const liveMoodRules = [
  {
    state: "confused",
    pattern: /\b(no se|not sure|confund|confused|ayuda|help|duda|problem|problema)\b/i,
  },
  {
    state: "excited",
    pattern: /\b(urgente|urgent|priority|prioridad|wow|perfecto|excelente|amazing|luxury|premium)\b/i,
  },
  {
    state: "thinking",
    pattern: /\b(presupuesto|budget|costo|cost|precio|estimate|permiso|permit|codigo|code)\b/i,
  },
  {
    state: "listening",
    pattern: /\b(material|tile|wood|porcelanato|acabado|finish|humedad|coastal|costa)\b/i,
  },
  {
    state: "typing",
    pattern: /\b(diseno|design|construccion|construction|remodelacion|remodel|cocina|kitchen|bano|bathroom)\b/i,
  },
  {
    state: "success",
    pattern: /\b(gracias|thanks|ok|confirmado|confirmed|listo|done)\b/i,
  },
];

const moodTransitionMs = 620;
const minimumMoodIntervalMs = 700;

function applyMoodState(visualStateName) {
  const state = states[visualStateName] ?? states.idle;
  if (widget.dataset.state === visualStateName) {
    return;
  }

  lastMoodChangeTime = Date.now();
  const previousSrc = avatar.currentSrc || avatar.src;
  const shouldCrossfade = previousSrc && !previousSrc.includes(state.image);
  bubble.querySelectorAll(".avatar-previous").forEach((image) => image.remove());

  if (shouldCrossfade) {
    const previousAvatar = document.createElement("img");
    previousAvatar.className = "avatar-layer avatar-previous";
    previousAvatar.src = previousSrc;
    previousAvatar.alt = "";
    previousAvatar.setAttribute("aria-hidden", "true");
    bubble.insertBefore(previousAvatar, avatar);
    window.setTimeout(() => previousAvatar.remove(), moodTransitionMs + 60);
  }

  widget.dataset.state = visualStateName;
  window.clearTimeout(moodTransitionTimer);
  bubble.classList.remove("mood-changing");
  void bubble.offsetWidth;
  bubble.classList.add("mood-changing");
  avatar.classList.add("avatar-current");
  avatar.src = state.image;
  avatar.alt = `Dingo ${state.label} state`;
  if (stateLabel) {
    stateLabel.textContent = state.label;
  }
  avatar.dataset.pulse = String(Date.now());
  moodTransitionTimer = window.setTimeout(() => {
    bubble.classList.remove("mood-changing");
    if (queuedMoodState && queuedMoodState !== widget.dataset.state) {
      const nextMood = queuedMoodState;
      queuedMoodState = undefined;
      applyMoodState(nextMood);
    }
  }, moodTransitionMs);
}

function setState(name, options = {}) {
  const visualStateName = isUserTyping ? "excited" : name;

  if (widget.dataset.state === visualStateName || queuedMoodState === visualStateName) {
    return;
  }

  if (options.decisive) {
    queuedMoodState = undefined;
    window.clearTimeout(queuedMoodTimer);
    applyMoodState(visualStateName);
    return;
  }

  const elapsed = Date.now() - lastMoodChangeTime;
  const isTransitioning = bubble.classList.contains("mood-changing");

  if (isTransitioning || elapsed < minimumMoodIntervalMs) {
    queuedMoodState = visualStateName;
    window.clearTimeout(queuedMoodTimer);
    queuedMoodTimer = window.setTimeout(() => {
      if (!queuedMoodState) {
        return;
      }

      const nextMood = queuedMoodState;
      queuedMoodState = undefined;
      applyMoodState(nextMood);
    }, Math.max(minimumMoodIntervalMs - elapsed, moodTransitionMs));
    return;
  }

  queuedMoodState = undefined;
  window.clearTimeout(queuedMoodTimer);
  applyMoodState(visualStateName);
}

function scheduleState(name, delay = 1600) {
  window.clearTimeout(stateTimer);
  stateTimer = window.setTimeout(() => setState(name), delay);
}

function getLiveMood(text) {
  const value = text.trim();

  if (!value) {
    return "listening";
  }

  const matchedRule = liveMoodRules.find((rule) => rule.pattern.test(value));
  if (matchedRule) {
    return matchedRule.state;
  }

  if (value.length < 12) {
    return "listening";
  }

  const thinkingCharacters = /[?¿]|\b(how|como|why|porque|cuanto|when|donde|where|what|que)\b/i;
  if (thinkingCharacters.test(value)) {
    return "thinking";
  }

  const neutralWritingStates = ["typing", "listening", "thinking"];
  moodIndex = (moodIndex + 1) % neutralWritingStates.length;
  return neutralWritingStates[moodIndex];
}

function stopMoodLoop() {
  window.clearInterval(moodTimer);
  moodTimer = undefined;
}

function startMoodLoop() {
  if (moodTimer) {
    return;
  }

  moodTimer = window.setInterval(() => {
    if (document.activeElement !== input || !input.value.trim()) {
      stopMoodLoop();
      return;
    }

    isUserTyping = true;
    setState("excited");
  }, 900);
}

function positionMessageAtStart(article) {
  const articleTop = article.offsetTop;
  messages.scrollTo({
    top: Math.max(articleTop - 12, 0),
    behavior: "smooth",
  });
}

function formatReplyText(text) {
  const safeText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^\s*[*•]\s+/gm, "- ")
    .replace(/[🙂😀😃😄😁😊😉😍🤔👍✅✨]/g, "");

  return safeText
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatBotReplyText(text) {
  const normalizedLines = text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/^\s*[*•]\s+/gm, "- ")
    .replace(/^-\s{2,}/gm, "- ")
    .split(/\r?\n/)
    .map((line, index, lines) => {
      const trimmed = line.trim();
      const nextLine = lines[index + 1]?.trim() || "";
      const looksLikeSubtitle =
        trimmed &&
        !trimmed.startsWith("-") &&
        !trimmed.startsWith("**") &&
        trimmed.length <= 52 &&
        !/[.!?¿¡:]$/.test(trimmed) &&
        (/^[-•*]\s+/.test(nextLine) || nextLine.length > 0);

      if (looksLikeSubtitle) {
        return `**${trimmed}**`;
      }

      return line.replace(/^\s*-\s*/, "- ");
    })
    .join("\n");

  return escapeHtml(normalizedLines)
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

function addMessage(text, sender, scrollMode = "end") {
  const article = document.createElement("article");
  article.className = `message ${sender}`;
  const paragraph = document.createElement("p");
  if (sender === "bot") {
    paragraph.innerHTML = formatBotReplyText(text);
  } else {
    paragraph.textContent = text;
  }
  article.append(paragraph);
  messages.append(article);

  if (scrollMode === "start") {
    positionMessageAtStart(article);
  } else if (scrollMode === "end") {
    messages.scrollTop = messages.scrollHeight;
  }

  return article;
}

function addBotElement(element, scrollMode = "end") {
  const article = document.createElement("article");
  article.className = "message bot schedule-message";
  article.append(element);
  messages.append(article);

  if (scrollMode === "start") {
    positionMessageAtStart(article);
  } else if (scrollMode === "end") {
    messages.scrollTop = messages.scrollHeight;
  }

  return article;
}

function addTypingMessage() {
  const article = document.createElement("article");
  article.className = "message bot";
  article.dataset.typing = "true";
  article.innerHTML = '<div class="typing" aria-label="Dingo is typing"><span></span><span></span><span></span></div>';
  messages.append(article);
  messages.scrollTop = messages.scrollHeight;
  return article;
}

function detectLanguage(text) {
  const spanishSignals =
    /[¿¡áéíóúñ]|\b(hola|como|cómo|que|qué|cuanto|cuánto|presupuesto|diseno|diseño|construccion|construcción|remodelacion|remodelación|materiales|cocina|bano|baño|cronograma|permiso|permisos|municipalidad|cotizar|ayuda|gracias)\b/i;
  return spanishSignals.test(text) ? "es" : "en";
}

function isSchedulingRequest(text) {
  return /schedule|agenda|agendar|cita|appointment|meeting|reunion|reuni|videocall|video call|videollamada|arquitecto|architect|ingeniero|engineer/i.test(
    text,
  );
}

function shouldUseLocalAnswer(prompt) {
  return (
    isSchedulingRequest(prompt) ||
    isRestrictedTechnicalQuestion(prompt) ||
    isPricingQuestion(prompt) ||
    /\b(quien eres|quién eres|who are you|what are you|como te llamas|cómo te llamas|your name|tu nombre|que eres|qué eres|que haces|qué haces|how can you help|what can you do|help me|ayudame|ayúdame|hola|hello|hi|buenas|contact|contacto|whatsapp|phone|telefono|teléfono|email|correo)\b/i.test(
      prompt,
    )
  );
}

function isRestrictedTechnicalQuestion(prompt) {
  return /\b(openai|api|api key|codex|github|backend|frontend|model|prompt|system instruction|widget|built|developed|como fuiste creado|c[oó]mo fuiste creado|como estas hecho|c[oó]mo estas hecho|que api|qu[eé] api|conectado a github)\b/i.test(
    prompt,
  );
}

function isPricingQuestion(prompt) {
  return /\b(price|pricing|cost|budget|estimate|investment|cost per square meter|square meter|sqm|m2|m²|house cost|construction cost|cuanto cuesta|cuánto cuesta|precio|costo|presupuesto|cotizar|estimaci[oó]n|metro cuadrado|metros cuadrados|inversi[oó]n)\b/i.test(
    prompt,
  );
}

function loadBookings() {
  return sessionBookings;
}

// Saves appointment data locally for now. Later this is the handoff point for Google Calendar.
function saveBookings(bookings) {
  sessionBookings = bookings;
}

// Stores lightweight project descriptions from the subtle project popover.
function saveProjectLead(description) {
  const lead = {
    description,
    timestamp: new Date().toISOString(),
  };
  sessionProjectLeads.push(lead);
  trackDingoEvent("project_description_submitted", { source: "popover" });
}

function looksLikeProjectDescription(description) {
  return /build|building|home|house|villa|remodel|renovation|design|land|lot|property|construction|kitchen|bathroom|pool|terrace|constru|casa|vivienda|remodel|diseño|diseno|terreno|lote|propiedad|obra|cocina|baño|bano|piscina|terraza|apartamento|condominio/i.test(
    description,
  );
}

function rememberConversation(role, content) {
  sessionConversation.push({
    role,
    content,
  });
  sessionConversation = sessionConversation.slice(-16);
}

function getNextSaturdays(count = 5) {
  const dates = [];
  const current = new Date();
  current.setHours(0, 0, 0, 0);

  while (dates.length < count) {
    if (current.getDay() === 6) {
      dates.push(new Date(current));
    }

    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function timeToMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function slotsOverlap(firstStart, secondStart) {
  const first = timeToMinutes(firstStart);
  const second = timeToMinutes(secondStart);
  return first < second + meetingDurationMinutes && second < first + meetingDurationMinutes;
}

function formatScheduleDate(date, language) {
  return new Intl.DateTimeFormat(language === "es" ? "es-CR" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function createScheduler(language) {
  const wrapper = document.createElement("section");
  wrapper.className = "scheduler-card";

  const title = document.createElement("h3");
  title.textContent =
    language === "es"
      ? "Agenda una videollamada con nuestro Arquitecto e Ingeniero"
      : "Schedule a video call with our Architect and Engineer";

  const detail = document.createElement("p");
  detail.textContent =
    language === "es"
      ? "Las videollamadas duran 90 minutos. Las citas son los sabados de 7:00 AM a 5:00 PM."
      : "Video calls last 90 minutes. Appointments are available on Saturdays from 7:00 AM to 5:00 PM.";

  const dateGrid = document.createElement("div");
  dateGrid.className = "schedule-date-grid";

  const slotGrid = document.createElement("div");
  slotGrid.className = "schedule-slot-grid";

  const confirmation = document.createElement("p");
  confirmation.className = "schedule-confirmation";

  const error = document.createElement("p");
  error.className = "schedule-error";

  const intake = document.createElement("form");
  intake.className = "schedule-intake";
  // Intake fields required before confirming a video call. Project name is the only required field.
  intake.innerHTML = `
    <label>
      ${language === "es" ? "Nombre del proyecto *" : "Project name *"}
      <input name="projectName" required />
    </label>
    <label>
      ${language === "es" ? "Nombre de la persona" : "Person name"}
      <input name="personName" />
    </label>
    <label>
      ${language === "es" ? "Correo electronico" : "Email"}
      <input name="email" type="email" />
    </label>
    <label>
      ${language === "es" ? "Telefono / WhatsApp" : "Phone / WhatsApp"}
      <input name="phone" />
    </label>
    <label>
      ${language === "es" ? "Vive en Costa Rica durante la construccion?" : "Will you live in Costa Rica during construction?"}
      <span class="schedule-radio-row">
        <label><input type="radio" name="livesInCostaRica" value="yes" /> ${language === "es" ? "Si" : "Yes"}</label>
        <label><input type="radio" name="livesInCostaRica" value="no" /> No</label>
      </span>
    </label>
    <label>
      ${language === "es" ? "Ya tiene propiedad?" : "Do you already own property?"}
      <span class="schedule-radio-row">
        <label><input type="radio" name="ownsProperty" value="yes" /> ${language === "es" ? "Si" : "Yes"}</label>
        <label><input type="radio" name="ownsProperty" value="no" /> No</label>
      </span>
    </label>
    <label>
      ${language === "es" ? "Que tiene en mente para el proyecto?" : "What do you have in mind for the project?"}
      <textarea name="projectIdea"></textarea>
    </label>
    <label>
      ${language === "es" ? "Que estilos arquitectonicos o de diseno le gustan?" : "What architectural or design styles do you like?"}
      <textarea name="designStyles"></textarea>
    </label>
  `;

  function getIntakeData() {
    const data = new FormData(intake);
    return {
      projectName: String(data.get("projectName") || "").trim(),
      personName: String(data.get("personName") || "").trim(),
      email: String(data.get("email") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      livesInCostaRica: String(data.get("livesInCostaRica") || ""),
      ownsProperty: String(data.get("ownsProperty") || ""),
      projectIdea: String(data.get("projectIdea") || "").trim(),
      designStyles: String(data.get("designStyles") || "").trim(),
    };
  }

  let selectedDate = getNextSaturdays(1)[0];

  function renderSlots() {
    slotGrid.innerHTML = "";
    const bookings = loadBookings();
    const selectedDateKey = dateKey(selectedDate);

    meetingSlots.forEach((slot) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = slot.label;

      const isBooked = bookings.some(
        (booking) => booking.date === selectedDateKey && slotsOverlap(booking.time, slot.value),
      );

      if (isBooked) {
        button.disabled = true;
        button.textContent = `${slot.label} · ${language === "es" ? "Reservado" : "Booked"}`;
      }

      button.addEventListener("click", () => {
        const intakeData = getIntakeData();

        if (!intakeData.projectName) {
          error.textContent =
            language === "es" ? "El nombre del proyecto es obligatorio." : "Project name is required.";
          intake.querySelector('[name="projectName"]').focus();
          setState("confused");
          return;
        }

        const updatedBookings = loadBookings();
        // Current implementation stores the booking locally. Replace this block with a secure
        // server call when integrating Google Calendar or a CRM.
        updatedBookings.push({
          date: selectedDateKey,
          time: slot.value,
          label: slot.label,
          duration: meetingDurationMinutes,
          title: "Video call with Monark Architect and Engineer",
          intake: intakeData,
        });
        saveBookings(updatedBookings);
        trackDingoEvent("video_call_booked", {
          date: selectedDateKey,
          time: slot.value,
          hasEmail: Boolean(intakeData.email),
        });
        setState("success");
        playSound("success");
        error.textContent = "";
        confirmation.textContent =
          language === "es"
            ? `Listo. Tu videollamada quedo reservada para ${formatScheduleDate(selectedDate, language)} a las ${slot.label}. Duracion: 90 minutos.`
            : `Done. Your video call is reserved for ${formatScheduleDate(selectedDate, language)} at ${slot.label}. Duration: 90 minutes.`;
        renderSlots();
      });

      slotGrid.append(button);
    });
  }

  getNextSaturdays(5).forEach((date, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = formatScheduleDate(date, language);

    if (index === 0) {
      button.classList.add("selected");
    }

    button.addEventListener("click", () => {
      selectedDate = date;
      dateGrid.querySelectorAll("button").forEach((dateButton) => dateButton.classList.remove("selected"));
      button.classList.add("selected");
      confirmation.textContent = "";
      renderSlots();
    });

    dateGrid.append(button);
  });

  wrapper.append(title, detail, intake, error, dateGrid, slotGrid, confirmation);
  renderSlots();
  return wrapper;
}

async function askDingoAi(prompt) {
  if (!aiConfig.endpoint) {
    throw new Error("AI endpoint is not configured.");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);

  const response = await fetch(aiConfig.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    signal: controller.signal,
    body: JSON.stringify({
      message: prompt,
      history: sessionConversation,
    }),
  }).finally(() => window.clearTimeout(timeout));

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "AI request failed.");
  }

  const reply = String(data.reply || "").trim();
  if (!reply) {
    throw new Error("AI response was empty.");
  }

  return reply;
}

async function analyzeProjectDescription(description) {
  const language = detectLanguage(description);
  const projectLikely = looksLikeProjectDescription(description);
  const instruction =
    language === "es"
      ? `Analiza esta descripcion inicial de proyecto para Monark Design Build. Da una opinion breve y util sobre lo que el usuario escribio, menciona 2 o 3 puntos que conviene aclarar, y ${
          projectLikely
            ? "recomienda con naturalidad agendar una videollamada con el Arquitecto e Ingeniero de Monark para dimensionarlo mejor."
            : "si no parece un proyecto claro, pide mas contexto antes de recomendar una reunion."
        } No uses emojis. Usa subtitulos breves en negrita. Descripcion: ${description}`
      : `Analyze this initial project description for Monark Design Build. Give a brief useful opinion about what the user wrote, mention 2 or 3 points worth clarifying, and ${
          projectLikely
            ? "naturally recommend scheduling a video call with Monark's Architect and Engineer to size it better."
            : "if it does not look like a clear project, ask for more context before recommending a meeting."
        } Do not use emojis. Use short bold subtitles. Description: ${description}`;

  try {
    return {
      text: await askDingoAi(instruction),
      projectLikely,
      language,
      source: "ai",
    };
  } catch (error) {
    return {
      text:
        language === "es"
          ? `**Primera lectura**\nLo que describes puede ser un buen punto de partida para ordenar alcance, ubicacion, estilo, presupuesto y tiempos.\n\n**Siguiente paso**\n${
              projectLikely
                ? "Recomiendo agendar una videollamada con nuestro Arquitecto e Ingeniero para dimensionarlo mejor y hacerte preguntas concretas."
                : "Cuéntame un poco mas sobre ubicacion, tipo de obra y etapa actual para orientarte mejor."
            }`
          : `**First read**\nWhat you described is a useful starting point for organizing scope, location, style, budget, and timing.\n\n**Next step**\n${
              projectLikely
                ? "I recommend scheduling a video call with our Architect and Engineer so Monark can size it better and ask the right questions."
                : "Tell me a little more about location, project type, and current stage so I can guide you better."
            }`,
      projectLikely,
      language,
      source: "local",
      error: error.message,
    };
  }
}

function craftReply(text) {
  const language = detectLanguage(text);
  const lower = text.toLowerCase();

  if (isRestrictedTechnicalQuestion(lower)) {
    return {
      state: "confused",
      text:
        language === "es"
          ? "Eso esta guardado en la casita de Dingo.\n\nPero si puedo ayudarte con Monark, diseno tropical o construir en Costa Rica."
          : "That is locked in the doghouse.\n\nBut I can help you with Monark, design, or building in Costa Rica.",
    };
  }

  if (isPricingQuestion(lower)) {
    return {
      state: "thinking",
      text:
        language === "es"
          ? "Buena pregunta.\n\nPara precios, lo mejor es usar Quick Estimate en el menu principal.\n\nTe da una primera referencia segun el area en m² / sqm.\n\nYa sabes el area aproximada?"
          : "Good question.\n\nFor pricing, the best first step is to use Quick Estimate in the main menu.\n\nIt gives you a first reference based on the project area in m² / sqm.\n\nDo you already know the approximate area?",
    };
  }

  if (
    /\b(quien eres|quién eres|who are you|what are you|como te llamas|cómo te llamas|your name|tu nombre|que eres|qué eres)\b/i.test(
      lower,
    )
  ) {
    return {
      state: "greeting",
      text:
        language === "es"
          ? "Soy Dingo, el asistente de Monark Design Build. Estoy aqui para orientarte sobre diseno, construccion, remodelaciones y proyectos en Costa Rica, y ayudarte a preparar una conversacion mas clara con el equipo de Monark."
          : "I am Dingo, the Monark Design Build assistant. I am here to guide you through design, construction, remodeling, and projects in Costa Rica, and help you prepare a clearer conversation with the Monark team.",
    };
  }

  if (/\b(que haces|qué haces|how can you help|what can you do|help me|ayudame|ayúdame)\b/i.test(lower)) {
    return {
      state: "listening",
      text:
        language === "es"
          ? "Puedo ayudarte a ordenar tus ideas de proyecto, entender materiales, presupuesto, permisos, cronograma, diseno y primeros pasos. Si quieres avanzar con Monark, tambien puedo ayudarte a preparar la informacion para solicitar una llamada o agendar una videollamada."
          : "I can help you organize project ideas, understand materials, permits, timeline, design direction, and first steps. For pricing, use Quick Estimate in the main menu. I can also help you prepare for a call with Monark.",
    };
  }

  if (/\b(monark|monarch|empresa|company|design build|quienes son|who is monark)\b/i.test(lower)) {
    return {
      state: "success",
      text:
        language === "es"
          ? "Monark Design Build acompana proyectos de diseno y construccion en Costa Rica. Mi papel es ayudarte a entender mejor tu proyecto y reunir datos utiles como ubicacion, alcance, estilo, presupuesto y tiempos antes de hablar con el equipo."
          : "Monark Design Build supports design and construction projects in Costa Rica. My role is to help you understand your project better and gather useful details like location, scope, style, budget, and timing before speaking with the team.",
    };
  }

  if (/\b(hola|hello|hi|buenas|good morning|good afternoon|hey)\b/i.test(lower)) {
    return {
      state: "greeting",
      text:
        language === "es"
          ? "Hola, soy Dingo. Cuéntame qué tienes en mente: construir, remodelar, revisar un terreno, definir estilo, estimar presupuesto o agendar una videollamada con Monark."
          : "Hi, I am Dingo. Tell me what you have in mind: building, remodeling, reviewing land, defining a design style, estimating a budget, or scheduling a video call with Monark.",
    };
  }

  if (/fuera|out of scope|receta|medicina|doctor|legal penal|crypto|bitcoin|politica|politics|tarea escolar|homework/.test(lower)) {
    return {
      state: "confused",
      text:
        language === "es"
          ? "Puedo ayudarte mejor si la consulta se relaciona con construccion, diseno, remodelaciones, materiales, Costa Rica o Monark Design Build."
          : "I can help best when the question relates to construction, design, remodeling, materials, Costa Rica, or Monark Design Build.",
    };
  }

  if (lower.length < 8 || /no se|not sure|confund|ayuda/.test(lower)) {
    return {
      state: "confused",
      text:
        language === "es"
          ? "Puedo ayudarte mejor si me das ubicacion, tamano aproximado, alcance del trabajo y etapa del proyecto. Con eso te propongo una ruta clara."
          : "I can help better with the location, approximate size, scope, and current project stage. With that, I can map a clear next step.",
    };
  }

  if (isSchedulingRequest(text)) {
    return {
      state: "success",
      text:
        "The Monark team will be happy to connect with you.\n\nTo schedule your video call, please fill out the form below so we can confirm your contact details.",
    };
  }

  if (/contact|contacto|whatsapp|phone|telefono|teléfono|email|correo|ubicacion|ubicación|location|address|direccion|dirección/.test(lower)) {
    return {
      state: "success",
      text:
        language === "es"
          ? "Puedes contactar a Monark Design Build por WhatsApp o telefono al +506 6447 1212, por correo a info@monarkcr.com, o ubicarlos en San Jose, Costa Rica."
          : "You can contact Monark Design Build by WhatsApp or phone at +506 6447 1212, by email at info@monarkcr.com, or find them in San Jose, Costa Rica.",
    };
  }

  if (/monark|empezar|start|cotizar|quote|contact|contacto|proyecto nuevo|new project/.test(lower)) {
    return {
      state: "success",
      text:
        language === "es"
          ? "Para empezar con Monark Design Build conviene reunir ubicacion, tipo de proyecto, medidas aproximadas, fotos del espacio, estilo deseado, presupuesto meta y fecha ideal. Con eso se puede ordenar una primera conversacion tecnica."
          : "To start with Monark Design Build, gather location, project type, approximate dimensions, site photos, desired style, target budget, and ideal timing. That gives the team a strong first technical conversation.",
    };
  }

  if (/presupuesto|budget|cost|precio|estimate/.test(lower)) {
    return {
      state: "success",
      text:
        language === "es"
          ? "Para un presupuesto inicial separaria alcance, demolicion, materiales, mano de obra, permisos, contingencia del 10 al 15% y calendario. Si me das medidas y acabados deseados, puedo ayudarte a ordenar una estimacion."
          : "For an early budget, separate scope, demolition, materials, labor, permits, a 10-15% contingency, and schedule. Share dimensions and desired finishes, and I can structure an estimate.",
    };
  }

  if (/permiso|permit|municipal|cfia|tramite|reglamento|retiro|setback/.test(lower)) {
    return {
      state: "thinking",
      text:
        language === "es"
          ? "En Costa Rica los permisos pueden depender de municipalidad, uso de suelo, planos, CFIA, disponibilidad de servicios y alcance de obra. Mi recomendacion: validar requisitos antes de presupuestar la obra final y confirmar todo con el profesional responsable."
          : "In Costa Rica, permits may depend on the municipality, land use, plans, CFIA process, utility availability, and project scope. Validate requirements before final budgeting and confirm details with the responsible licensed professional.",
    };
  }

  if (/material|floor|tile|wood|humed|coastal|costa|acabado/.test(lower)) {
    return {
      state: "excited",
      text:
        language === "es"
          ? "Para zonas humedas o costeras priorizaria porcelanato, superficies compactas, herrajes resistentes a corrosion, pinturas lavables y ventilacion bien resuelta. La seleccion final depende de uso, mantenimiento y presupuesto."
          : "For humid or coastal spaces, I would prioritize porcelain, compact surfaces, corrosion-resistant hardware, washable paints, and strong ventilation. Final selection depends on use, maintenance, and budget.",
    };
  }

  if (/diseño|diseno|design|estilo|style|interior|fachada|facade|layout|distribucion/.test(lower)) {
    return {
      state: "excited",
      text:
        language === "es"
          ? "Para definir un buen diseno empezaria por uso diario, clima, luz natural, circulacion, mantenimiento y presupuesto. Luego se elige un lenguaje visual coherente: moderno tropical, contemporaneo calido, minimalista o clasico actualizado."
          : "For a strong design direction, start with daily use, climate, natural light, circulation, maintenance, and budget. Then choose a coherent visual language: tropical modern, warm contemporary, minimal, or updated classic.",
    };
  }

  if (/cronograma|schedule|timeline|etapas|planning|planificacion/.test(lower)) {
    return {
      state: "success",
      text:
        language === "es"
          ? "Un flujo solido seria: diagnostico, diseno conceptual, presupuesto, permisos, compras criticas, obra gris, instalaciones, acabados, punch list y entrega. Conviene bloquear decisiones de materiales antes de iniciar obra."
          : "A solid flow is: assessment, concept design, budget, permits, critical procurement, rough construction, MEP, finishes, punch list, and handoff. Lock material decisions before construction starts.",
    };
  }

  if (/estructura|structural|viga|columna|foundation|cimientos|sismo|seismic/.test(lower)) {
    return {
      state: "thinking",
      text:
        language === "es"
          ? "Para temas estructurales puedo orientarte en preguntas y criterios generales, pero las decisiones de vigas, columnas, cimentaciones y sismo deben revisarlas un ingeniero o profesional responsable con planos y visita al sitio."
          : "For structural topics I can help with general questions and planning criteria, but beams, columns, foundations, and seismic decisions must be reviewed by a licensed professional with drawings and site context.",
    };
  }

  return {
    state: "success",
    text:
      language === "es"
        ? "Buena consulta. Desde Monark Design Build revisaria primero objetivo, restricciones del sitio, presupuesto, estilo deseado y riesgos tecnicos. Dame un poco mas de contexto y te respondo con una recomendacion concreta."
        : "Good question. From a Monark Design Build perspective, I would first review goals, site constraints, budget, design direction, and technical risks. Give me a little more context and I will make a concrete recommendation.",
  };
}

function openPanel() {
  unlockAudio();
  panel.classList.add("open");
  hideContextNudge(true);
  projectPopover?.classList.remove("visible");
  bubble.setAttribute("aria-label", "Close chat with Dingo");
  notificationDot.hidden = true;
  startHint?.classList.add("hidden");
  setState("greeting", { decisive: true });
  playSound("open");
  trackDingoEvent("chat_opened");
  scheduleState("listening", 1200);
  input.focus();
}

function closePanel() {
  panel.classList.remove("open");
  bubble.setAttribute("aria-label", "Open chat with Dingo");
  stopMoodLoop();
  isUserTyping = false;
  trackDingoEvent("chat_closed");
  setState("idle", { decisive: true });
}

function submitPrompt(text) {
  const prompt = text.trim();
  if (!prompt) {
    isUserTyping = false;
    setState("confused", { decisive: true });
    scheduleState("listening", 1200);
    return;
  }

  enterConversationMode();
  addMessage(prompt, "user");
  rememberConversation("user", prompt);
  trackDingoEvent("message_sent", {
    intent: isSchedulingRequest(prompt) ? "schedule" : "general",
    language: detectLanguage(prompt),
  });
  input.value = "";
  stopMoodLoop();
  isUserTyping = false;
  setState("thinking", { decisive: true });

  window.setTimeout(() => {
    const typingMessage = addTypingMessage();
    setState("typing", { decisive: true });

    window.setTimeout(async () => {
      if (isSchedulingRequest(prompt)) {
        const language = detectLanguage(prompt);
        const reply = craftReply(prompt);
        typingMessage.remove();
        const replyArticle = addMessage(reply.text, "bot", "none");
        rememberConversation("assistant", reply.text);
        addBotElement(createScheduler(language), "none");
        positionMessageAtStart(replyArticle);
        setState("excited", { decisive: true });
        scheduleState("listening", 2600);
        return;
      }

      if (shouldUseLocalAnswer(prompt)) {
        const reply = craftReply(prompt);
        typingMessage.remove();
        addMessage(reply.text, "bot", "start");
        rememberConversation("assistant", reply.text);
        setState(reply.state, { decisive: true });
        playSound(reply.state === "success" ? "success" : "reply");
        scheduleState("listening", 2600);
        return;
      }

      try {
        const aiReply = await askDingoAi(prompt);
        typingMessage.remove();
        addMessage(aiReply, "bot", "start");
        rememberConversation("assistant", aiReply);
        setState("success", { decisive: true });
        playSound("reply");
        trackDingoEvent("ai_response_received", { provider: aiConfig.provider });
      } catch (error) {
        const reply = craftReply(prompt);
        typingMessage.remove();
        addMessage(reply.text, "bot", "start");
        rememberConversation("assistant", reply.text);
        setState(reply.state, { decisive: true });
        playSound(reply.state === "confused" ? "soft" : "reply");
        trackDingoEvent("ai_response_failed", { reason: error.message });
      }
      scheduleState("listening", 2600);
    }, 950);
  }, 550);
}

function submitQuickAction(button) {
  const prompt = button.dataset.prompt?.trim();
  const response = button.dataset.response?.trim();
  if (!prompt || !response) {
    submitPrompt(prompt || "");
    return;
  }

  enterConversationMode();
  addMessage(prompt, "user");
  addMessage(response, "bot", "start");
  rememberConversation("user", prompt);
  rememberConversation("assistant", response);
  input.value = "";
  stopMoodLoop();
  isUserTyping = false;
  setState("success", { decisive: true });
  playSound("reply");
  scheduleState("listening", 1800);
}

bubble.addEventListener("click", () => {
  if (widget.classList.contains("calculator-open")) {
    closeCalculator();
    return;
  }

  if (panel.classList.contains("open")) {
    closePanel();
  } else {
    openPanel();
  }
});

closeChat.addEventListener("click", closePanel);
backToStart?.addEventListener("click", showStartOptions);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitPrompt(input.value);
});

input.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.shiftKey) {
    return;
  }

  event.preventDefault();
  submitPrompt(input.value);
});

input.addEventListener("focus", () => {
  isUserTyping = Boolean(input.value.trim());
  setState(input.value.trim() ? "excited" : "listening");
  startMoodLoop();
});

input.addEventListener("input", () => {
  window.clearTimeout(stateTimer);
  isUserTyping = Boolean(input.value.trim());
  setState(isUserTyping ? "excited" : "listening");

  if (input.value.trim()) {
    startMoodLoop();
  } else {
    stopMoodLoop();
  }
});

quickActions.forEach((button) => {
  button.addEventListener("click", () => {
    if (button === openCostCalculator) {
      openCalculator();
      return;
    }

    openPanel();
    trackDingoEvent("quick_action_clicked", { label: button.textContent.trim() });
    submitQuickAction(button);
  });
});

openCostCalculator?.addEventListener("click", openCalculator);
closeCostCalculator?.addEventListener("click", closeCalculator);
costArea?.addEventListener("input", updateCostEstimate);
costUnit?.addEventListener("change", updateCostEstimate);
costCategory?.addEventListener("change", updateCostEstimate);
costResult?.addEventListener("click", (event) => {
  if (!event.target.closest(".cost-schedule-button")) {
    return;
  }

  closeCalculator();
  openPanel();
  setState("excited", { decisive: true });
  trackDingoEvent("premium_cost_schedule_clicked");
  submitPrompt("Schedule a video call with our Architect and Engineer.");
});

if (contactUsButton) {
  contactUsButton.addEventListener("click", () => {
    hideContextNudge(true);
    contactMenu.classList.toggle("open");
    setState(contactMenu.classList.contains("open") ? "excited" : "listening");
    trackDingoEvent("contact_us_toggled", { open: contactMenu.classList.contains("open") });
  });
}

if (scheduleFromContact) {
  scheduleFromContact.addEventListener("click", () => {
    contactMenu.classList.remove("open");
    openPanel();
    setState("excited", { decisive: true });
    trackDingoEvent("schedule_from_contact_clicked");
    submitPrompt("Schedule a video call with our Architect and Engineer.");
  });
}

// Contextual hover support: add data-dingo-context="architectural-design" to any page section later.
function setupContextualNudges() {
  const targets = document.querySelectorAll(
    '[data-dingo-context="architectural-design"], .architectural-design, #architectural-design',
  );

  targets.forEach((target) => {
    target.addEventListener("mouseenter", () => {
      if (isDingoAppActive() || projectPopover.classList.contains("visible")) {
        return;
      }

      contextNudge.textContent = "Do you have questions about design? Remember, I am here to help.";
      contextNudge.classList.add("visible");
      setState("listening");
      playSound("nudge");
      trackDingoEvent("context_nudge_shown", { context: "architectural-design" });
    });

    target.addEventListener("mouseleave", () => {
      hideContextNudge(true);
      scheduleState("idle", 600);
    });
  });
}

function hideInfoNudgeWithSweep() {
  hideContextNudge();
}

function showInfoNudge() {
  if (isDingoAppActive() || projectPopover.classList.contains("visible")) {
    hideContextNudge(true);
    return;
  }

  contextNudge.textContent = infoNudges[infoNudgeIndex % infoNudges.length];
  infoNudgeIndex += 1;
  contextNudge.classList.remove("sweeping");
  contextNudge.classList.add("visible");
  setState("listening");
  playSound("nudge");
  trackDingoEvent("info_nudge_shown");

  window.clearTimeout(infoNudgeHideTimer);
  infoNudgeHideTimer = window.setTimeout(hideInfoNudgeWithSweep, 15000);
}

function startInfoNudges() {
  window.clearInterval(infoNudgeTimer);
  infoNudgeTimer = window.setInterval(showInfoNudge, 40000);
}

function showProjectPopover() {
  if (projectPopoverShown || isDingoAppActive()) {
    if (isDingoAppActive()) {
      window.setTimeout(showProjectPopover, 15000);
    }
    return;
  }

  projectPopoverShown = true;
  projectPopover.classList.add("visible");
  setState("listening");
  playSound("soft");
  trackDingoEvent("project_popover_shown");
}

projectPopoverClose?.addEventListener("click", () => {
  projectPopover.classList.remove("visible");
  trackDingoEvent("project_popover_closed");
});

contextNudge?.addEventListener("click", () => {
  hideContextNudge();
  trackDingoEvent("context_nudge_dismissed");
});

projectPopoverForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const description = projectPopoverInput.value.trim();

  if (!description) {
    projectPopoverInput.focus();
    return;
  }

  saveProjectLead(description);
  projectPopover.classList.remove("visible");
  openPanel();
  enterConversationMode();
  addMessage(description, "user");
  rememberConversation("user", description);
  setState("thinking", { decisive: true });

  window.setTimeout(async () => {
    const typingMessage = addTypingMessage();
    setState("typing", { decisive: true });
    const analysis = await analyzeProjectDescription(description);
    typingMessage.remove();
    const replyArticle = addMessage(analysis.text, "bot", "none");
    rememberConversation("assistant", analysis.text);

    if (analysis.projectLikely) {
      addBotElement(createScheduler(analysis.language), "none");
      trackDingoEvent("project_popover_guided_to_schedule", { source: analysis.source });
      playSound("success");
      setState("success", { decisive: true });
    } else {
      trackDingoEvent("project_popover_requested_more_context", { source: analysis.source });
      playSound("reply");
      setState("listening", { decisive: true });
    }

    positionMessageAtStart(replyArticle);
    scheduleState("listening", 2600);
  }, 500);
});

setupContextualNudges();
startInfoNudges();
window.setTimeout(showProjectPopover, 18000);

setState("idle");
