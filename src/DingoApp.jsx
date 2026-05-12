import { useEffect, useMemo, useRef, useState } from "react";

const ASSET_VERSION = "2026-05-11-debug-pass";
const WHATSAPP_URL = "https://api.whatsapp.com/send?phone=50664471212";
const MONARK_EMAIL = "info@monarkcr.com";
const AI_ENDPOINT = import.meta.env.VITE_DINGO_AI_ENDPOINT || "/api/ai";

const STATES = {
  idle: { label: "Idle", image: "/assets/dingo-idle-dog.png" },
  greeting: { label: "Greeting", image: "/assets/dingo-greeting-dog.png" },
  listening: { label: "Listening", image: "/assets/dingo-listening-dog.png" },
  thinking: { label: "Thinking", image: "/assets/dingo-thinking-dog.png" },
  typing: { label: "Typing / Responding", image: "/assets/dingo-typing-dog.png" },
  excited: { label: "Excited / Priority", image: "/assets/dingo-excited-dog.png" },
  confused: { label: "Confused", image: "/assets/dingo-confused-dog.png" },
  success: { label: "Success / Confirmed", image: "/assets/dingo-success-dog.png" },
};

const QUICK_ACTIONS = [
  {
    label: "I want to build in Guanacaste",
    prompt: "I want to build in Guanacaste. What should I know first?",
  },
  {
    label: "I already own land",
    prompt: "I already own land in Costa Rica. What should I prepare before designing?",
  },
  {
    label: "I live outside Costa Rica",
    prompt: "I live outside Costa Rica. How can I manage a design build project remotely?",
  },
  {
    label: "Show me the Monark process",
    prompt: "Show me the Monark process for designing and building a home.",
  },
];

const MEETING_DURATION_MINUTES = 90;
const MEETING_SLOTS = [
  { label: "7:00 AM", value: "07:00" },
  { label: "8:30 AM", value: "08:30" },
  { label: "10:00 AM", value: "10:00" },
  { label: "1:00 PM", value: "13:00" },
  { label: "2:30 PM", value: "14:30" },
  { label: "3:30 PM", value: "15:30" },
];

const INFO_NUDGES = [
  "Planning to build in Costa Rica? Dingo can help you organize your first questions.",
  "Have design doubts? I can help you think through style, materials, and next steps.",
  "Building remotely? Ask Dingo how to prepare for a Monark video call.",
  "Need a starting point? Tell Dingo about your land, budget, timeline, or design goals.",
];

function avatarPath(state) {
  return `${STATES[state].image}?v=${ASSET_VERSION}`;
}

function detectLanguage(text) {
  return /[¿¡áéíóúñ]|\b(hola|como|cómo|que|qué|presupuesto|diseño|construcción|remodelación|materiales|permiso|gracias)\b/i.test(
    text,
  )
    ? "es"
    : "en";
}

function isSchedulingRequest(text) {
  return /schedule|agenda|agendar|cita|appointment|meeting|reunion|reuni|videocall|video call|videollamada|arquitecto|architect|ingeniero|engineer/i.test(
    text,
  );
}

function shouldUseLocalAnswer(text) {
  return (
    isSchedulingRequest(text) ||
    /\b(quien eres|quién eres|who are you|what are you|como te llamas|cómo te llamas|your name|tu nombre|que eres|qué eres|que haces|qué haces|how can you help|what can you do|help me|ayudame|ayúdame|hola|hello|hi|buenas|contact|contacto|whatsapp|phone|telefono|teléfono|email|correo)\b/i.test(
      text,
    )
  );
}

function craftLocalReply(text) {
  const language = detectLanguage(text);
  const lower = text.toLowerCase();

  if (/\b(quien eres|quién eres|who are you|what are you|como te llamas|your name|tu nombre|qué eres|que eres)\b/i.test(lower)) {
    return {
      state: "greeting",
      text:
        language === "es"
          ? "Soy Dingo, el asistente de Monark Design Build. Estoy aquí para orientarte sobre diseño, construcción, remodelaciones y proyectos en Costa Rica, y ayudarte a preparar una conversación más clara con el equipo de Monark."
          : "I am Dingo, the Monark Design Build assistant. I am here to guide you through design, construction, remodeling, and projects in Costa Rica, and help you prepare a clearer conversation with the Monark team.",
    };
  }

  if (/\b(que haces|qué haces|how can you help|what can you do|help me|ayudame|ayúdame)\b/i.test(lower)) {
    return {
      state: "listening",
      text:
        language === "es"
          ? "Puedo ayudarte a ordenar tus ideas de proyecto, entender materiales, presupuesto, permisos, cronograma, diseño y primeros pasos. También puedo ayudarte a preparar información para una llamada con Monark."
          : "I can help you organize your project ideas, understand materials, budget, permits, timeline, design direction, and first steps. I can also help you prepare information for a call with Monark.",
    };
  }

  if (isSchedulingRequest(text)) {
    return {
      state: "excited",
      text:
        "The Monark team will be happy to connect with you.\n\nTo schedule your video call, please fill out the form below so we can confirm your contact details.",
    };
  }

  if (/contact|contacto|whatsapp|phone|telefono|teléfono|email|correo|location|ubicacion|ubicación/i.test(lower)) {
    return {
      state: "success",
      text:
        language === "es"
          ? "Puedes contactar a Monark Design Build por WhatsApp o teléfono, enviar un correo a info@monarkcr.com, o usar el botón Contact us para agendar una videollamada."
          : "You can contact Monark Design Build by WhatsApp, send an email to info@monarkcr.com, or use the Contact us button to schedule a video call.",
    };
  }

  return {
    state: "success",
    text:
      language === "es"
        ? "Buena consulta. Para orientarte mejor, dime ubicación, tipo de proyecto, etapa actual y qué decisión necesitas tomar primero."
        : "Good question. To guide you better, tell me the location, project type, current stage, and the first decision you need help with.",
  };
}

function formatReplyText(text) {
  const safeText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^\s*[*•]\s+/gm, "- ")
    .replace(/[🙂😀😃😄😁😊😉😍🤔👍✅✨]/g, "");

  return safeText.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
}

function getNextSaturdays(count = 5) {
  const dates = [];
  const current = new Date();
  current.setHours(0, 0, 0, 0);

  while (dates.length < count) {
    if (current.getDay() === 6) dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function formatScheduleDate(date, language) {
  return new Intl.DateTimeFormat(language === "es" ? "es-CR" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function timeToMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function slotsOverlap(firstStart, secondStart) {
  const first = timeToMinutes(firstStart);
  const second = timeToMinutes(secondStart);
  return first < second + MEETING_DURATION_MINUTES && second < first + MEETING_DURATION_MINUTES;
}

function useAudio() {
  const audioRef = useRef(null);
  const unlockedRef = useRef(false);

  function unlock() {
    if (unlockedRef.current) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    audioRef.current = audioRef.current || new AudioContext();
    if (audioRef.current.state === "suspended") audioRef.current.resume();
    unlockedRef.current = true;
  }

  function tone(frequency, startTime, duration, gainValue, type = "sine") {
    const audio = audioRef.current;
    if (!audio || !unlockedRef.current) return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
  }

  function play(name) {
    const audio = audioRef.current;
    if (!audio || !unlockedRef.current) return;
    const now = audio.currentTime;
    const volume = 0.035;
    if (name === "open") {
      tone(392, now, 0.09, volume);
      tone(523.25, now + 0.08, 0.12, volume * 0.9);
    } else if (name === "reply") {
      tone(659.25, now, 0.08, volume * 0.65);
    } else if (name === "success") {
      tone(523.25, now, 0.08, volume);
      tone(659.25, now + 0.075, 0.08, volume);
      tone(783.99, now + 0.15, 0.13, volume * 0.85);
    } else if (name === "nudge") {
      tone(329.63, now, 0.1, volume * 0.5, "triangle");
    } else if (name === "soft") {
      tone(440, now, 0.07, volume * 0.45, "triangle");
    }
  }

  return { unlock, play };
}

function BotMessage({ children }) {
  return <article className="message bot">{children}</article>;
}

function TextMessage({ message }) {
  if (message.sender === "bot") {
    return (
      <article className="message bot">
        <p dangerouslySetInnerHTML={{ __html: formatReplyText(message.text) }} />
      </article>
    );
  }

  return (
    <article className="message user">
      <p>{message.text}</p>
    </article>
  );
}

function TypingMessage() {
  return (
    <article className="message bot">
      <div className="typing" aria-label="Dingo is typing">
        <span />
        <span />
        <span />
      </div>
    </article>
  );
}

function Scheduler({ language, bookings, onBook }) {
  const [selectedDate, setSelectedDate] = useState(getNextSaturdays(1)[0]);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [intake, setIntake] = useState({
    projectName: "",
    personName: "",
    email: "",
    phone: "",
    livesInCostaRica: "",
    ownsProperty: "",
    projectIdea: "",
    designStyles: "",
  });

  const selectedDateKey = dateKey(selectedDate);

  function updateField(name, value) {
    setIntake((current) => ({ ...current, [name]: value }));
  }

  function book(slot) {
    if (!intake.projectName.trim()) {
      setError(language === "es" ? "El nombre del proyecto es obligatorio." : "Project name is required.");
      return;
    }

    onBook({
      date: selectedDateKey,
      time: slot.value,
      label: slot.label,
      duration: MEETING_DURATION_MINUTES,
      title: "Video call with Monark Architect and Engineer",
      intake,
    });
    setError("");
    setConfirmation(
      language === "es"
        ? `Listo. Tu videollamada quedó reservada para ${formatScheduleDate(selectedDate, language)} a las ${slot.label}. Duración: 1 hora y 30 minutos.`
        : `Done. Your video call is reserved for ${formatScheduleDate(selectedDate, language)} at ${slot.label}. Duration: 90 minutes.`,
    );
  }

  return (
    <section className="scheduler-card">
      <h3>
        {language === "es"
          ? "Agenda una videollamada con nuestro Arquitecto e Ingeniero"
          : "Schedule a video call with our Architect and Engineer"}
      </h3>
      <p>
        {language === "es"
          ? "Las videollamadas duran 90 minutos. Las citas son los sábados de 7:00 AM a 5:00 PM."
          : "Video calls last 90 minutes. Appointments are available on Saturdays from 7:00 AM to 5:00 PM."}
      </p>

      <form className="schedule-intake">
        <label>
          {language === "es" ? "Nombre del proyecto *" : "Project name *"}
          <input value={intake.projectName} onChange={(event) => updateField("projectName", event.target.value)} />
        </label>
        <label>
          {language === "es" ? "Nombre de la persona" : "Person name"}
          <input value={intake.personName} onChange={(event) => updateField("personName", event.target.value)} />
        </label>
        <label>
          {language === "es" ? "Correo electrónico" : "Email"}
          <input type="email" value={intake.email} onChange={(event) => updateField("email", event.target.value)} />
        </label>
        <label>
          {language === "es" ? "Teléfono / WhatsApp" : "Phone / WhatsApp"}
          <input value={intake.phone} onChange={(event) => updateField("phone", event.target.value)} />
        </label>
        <label>
          {language === "es" ? "¿Vive en Costa Rica durante la construcción?" : "Will you live in Costa Rica during construction?"}
          <span className="schedule-radio-row">
            <label>
              <input
                type="radio"
                name="livesInCostaRica"
                value="yes"
                checked={intake.livesInCostaRica === "yes"}
                onChange={(event) => updateField("livesInCostaRica", event.target.value)}
              />
              {language === "es" ? "Sí" : "Yes"}
            </label>
            <label>
              <input
                type="radio"
                name="livesInCostaRica"
                value="no"
                checked={intake.livesInCostaRica === "no"}
                onChange={(event) => updateField("livesInCostaRica", event.target.value)}
              />
              No
            </label>
          </span>
        </label>
        <label>
          {language === "es" ? "¿Ya tiene propiedad?" : "Do you already own property?"}
          <span className="schedule-radio-row">
            <label>
              <input
                type="radio"
                name="ownsProperty"
                value="yes"
                checked={intake.ownsProperty === "yes"}
                onChange={(event) => updateField("ownsProperty", event.target.value)}
              />
              {language === "es" ? "Sí" : "Yes"}
            </label>
            <label>
              <input
                type="radio"
                name="ownsProperty"
                value="no"
                checked={intake.ownsProperty === "no"}
                onChange={(event) => updateField("ownsProperty", event.target.value)}
              />
              No
            </label>
          </span>
        </label>
        <label>
          {language === "es" ? "¿Qué tiene en mente para el proyecto?" : "What do you have in mind for the project?"}
          <textarea value={intake.projectIdea} onChange={(event) => updateField("projectIdea", event.target.value)} />
        </label>
        <label>
          {language === "es" ? "¿Qué estilos arquitectónicos o de diseño le gustan?" : "What architectural or design styles do you like?"}
          <textarea value={intake.designStyles} onChange={(event) => updateField("designStyles", event.target.value)} />
        </label>
      </form>

      <p className="schedule-error">{error}</p>
      <div className="schedule-date-grid">
        {getNextSaturdays(5).map((date) => (
          <button
            className={dateKey(date) === selectedDateKey ? "selected" : ""}
            key={dateKey(date)}
            type="button"
            onClick={() => {
              setSelectedDate(date);
              setConfirmation("");
              setError("");
            }}
          >
            {formatScheduleDate(date, language)}
          </button>
        ))}
      </div>
      <div className="schedule-slot-grid">
        {MEETING_SLOTS.map((slot) => {
          const isBooked = bookings.some((booking) => booking.date === selectedDateKey && slotsOverlap(booking.time, slot.value));
          return (
            <button disabled={isBooked} key={slot.value} type="button" onClick={() => book(slot)}>
              {isBooked ? `${slot.label} · ${language === "es" ? "Reservado" : "Booked"}` : slot.label}
            </button>
          );
        })}
      </div>
      <p className="schedule-confirmation">{confirmation}</p>
    </section>
  );
}

function WelcomeCard() {
  return (
    <section className="welcome-card" aria-label="Dingo introduction">
      <div className="welcome-avatar" aria-hidden="true">
        <img src={avatarPath("excited")} alt="" />
      </div>
      <div className="welcome-copy">
        <p>Hi, I'm your Monark project guide. I can help you understand how to design and build a tropical home in Costa Rica.</p>
        <p>What brings you here today?</p>
      </div>
    </section>
  );
}

function ProjectPopover({ visible, onClose, onSubmit }) {
  const [description, setDescription] = useState("");

  function submit(event) {
    event.preventDefault();
    if (!description.trim()) return;
    onSubmit(description.trim());
    setDescription("");
  }

  return (
    <section className={`project-popover ${visible ? "visible" : ""}`} aria-label="Project description prompt">
      <button className="project-popover-close" type="button" aria-label="Close project prompt" onClick={onClose}>
        x
      </button>
      <p>If you describe your project, we can help you size it better.</p>
      <form onSubmit={submit}>
        <input
          aria-label="Project description"
          placeholder="Briefly describe your project"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <button type="submit">Send</button>
      </form>
    </section>
  );
}

export function DingoApp() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState("idle");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showStartHint, setShowStartHint] = useState(true);
  const [contactOpen, setContactOpen] = useState(false);
  const [nudge, setNudge] = useState("");
  const [nudgeSweeping, setNudgeSweeping] = useState(false);
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [popoverShown, setPopoverShown] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [conversation, setConversation] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const messagesRef = useRef(null);
  const audio = useAudio();

  const visualState = isTyping ? "excited" : state;
  const avatarState = STATES[visualState] ? visualState : "idle";
  const [displayAvatarState, setDisplayAvatarState] = useState(avatarState);
  const [previousAvatarState, setPreviousAvatarState] = useState(null);
  const [isMoodChanging, setIsMoodChanging] = useState(false);

  useEffect(() => {
    if (avatarState === displayAvatarState) return undefined;

    setPreviousAvatarState(displayAvatarState);
    setDisplayAvatarState(avatarState);
    setIsMoodChanging(true);

    const transitionTimer = window.setTimeout(() => {
      setIsMoodChanging(false);
      setPreviousAvatarState(null);
    }, 360);

    return () => window.clearTimeout(transitionTimer);
  }, [avatarState, displayAvatarState]);

  function track(name, details = {}) {
    setMetrics((current) => [...current.slice(-99), { name, details, timestamp: new Date().toISOString() }]);
  }

  function remember(role, content) {
    setConversation((current) => [...current, { role, content }].slice(-8));
  }

  function scrollToMessageStart(index) {
    window.requestAnimationFrame(() => {
      const container = messagesRef.current;
      const item = container?.querySelector(`[data-message-index="${index}"]`);
      if (container && item) {
        container.scrollTo({ top: Math.max(item.offsetTop - 12, 0), behavior: "smooth" });
      }
    });
  }

  function addMessage(message, scrollMode = "end") {
    setMessages((current) => {
      const next = [...current, message];
      const index = next.length - 1;
      window.requestAnimationFrame(() => {
        const container = messagesRef.current;
        if (!container) return;
        if (scrollMode === "start") scrollToMessageStart(index);
        if (scrollMode === "end") container.scrollTop = container.scrollHeight;
      });
      return next;
    });
  }

  function openPanel() {
    audio.unlock();
    setIsOpen(true);
    setShowStartHint(false);
    setState("greeting");
    audio.play("open");
    window.setTimeout(() => setState("listening"), 1200);
    track("chat_opened");
  }

  function closePanel() {
    setIsOpen(false);
    setIsTyping(false);
    setState("idle");
    setContactOpen(false);
    track("chat_closed");
  }

  async function askAi(prompt) {
    const response = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt, history: conversation }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "AI request failed.");
    return String(data.reply || "").trim();
  }

  async function submitPrompt(promptValue) {
    const prompt = promptValue.trim();
    if (!prompt) {
      setState("confused");
      window.setTimeout(() => setState("listening"), 1200);
      return;
    }

    addMessage({ sender: "user", text: prompt }, "end");
    remember("user", prompt);
    setInput("");
    setIsTyping(false);
    setState("thinking");
    track("message_sent", { language: detectLanguage(prompt), intent: isSchedulingRequest(prompt) ? "schedule" : "general" });

    window.setTimeout(async () => {
      const typingId = crypto.randomUUID();
      addMessage({ id: typingId, sender: "typing" }, "end");
      setState("typing");

      function removeTyping() {
        setMessages((current) => current.filter((message) => message.id !== typingId));
      }

      if (isSchedulingRequest(prompt)) {
        const language = detectLanguage(prompt);
        const reply = craftLocalReply(prompt);
        removeTyping();
        addMessage({ sender: "bot", text: reply.text }, "none");
        remember("assistant", reply.text);
        addMessage({ sender: "scheduler", language }, "start");
        setState("excited");
        window.setTimeout(() => setState("listening"), 2600);
        return;
      }

      if (shouldUseLocalAnswer(prompt)) {
        const reply = craftLocalReply(prompt);
        removeTyping();
        addMessage({ sender: "bot", text: reply.text }, "start");
        remember("assistant", reply.text);
        setState(reply.state);
        audio.play(reply.state === "success" ? "success" : "reply");
        window.setTimeout(() => setState("listening"), 2600);
        return;
      }

      try {
        const aiReply = await askAi(prompt);
        removeTyping();
        addMessage({ sender: "bot", text: aiReply }, "start");
        remember("assistant", aiReply);
        setState("success");
        audio.play("reply");
        track("ai_response_received");
      } catch (error) {
        const reply = craftLocalReply(prompt);
        removeTyping();
        addMessage({ sender: "bot", text: reply.text }, "start");
        remember("assistant", reply.text);
        setState(reply.state);
        audio.play("soft");
        track("ai_response_failed", { reason: error.message });
      } finally {
        window.setTimeout(() => setState("listening"), 2600);
      }
    }, 550);
  }

  function showInfoNudge() {
    if (isOpen || popoverVisible) return;
    const text = INFO_NUDGES[metrics.length % INFO_NUDGES.length];
    setNudge(text);
    setNudgeSweeping(false);
    setState("listening");
    audio.play("nudge");
    window.setTimeout(() => {
      setNudgeSweeping(true);
      window.setTimeout(() => setNudge(""), 540);
    }, 15000);
  }

  useEffect(() => {
    const popoverTimer = window.setTimeout(() => {
      if (!popoverShown && !isOpen) {
        setPopoverShown(true);
        setPopoverVisible(true);
        setState("listening");
        audio.play("soft");
      }
    }, 18000);

    const nudgeTimer = window.setInterval(showInfoNudge, 40000);
    return () => {
      window.clearTimeout(popoverTimer);
      window.clearInterval(nudgeTimer);
    };
  }, [isOpen, popoverShown, popoverVisible, metrics.length]);

  function bookVideoCall(booking) {
    setBookings((current) => [...current, booking]);
    setState("success");
    audio.play("success");
    track("video_call_booked", { date: booking.date, time: booking.time });
  }

  function handleProjectPopoverSubmit(description) {
    setPopoverVisible(false);
    openPanel();
    addMessage({ sender: "user", text: description }, "end");
    remember("user", description);
    setState("thinking");
    window.setTimeout(() => {
      const firstReply =
        "Thank you. That gives me a helpful starting point. I can guide you through the main decisions: location, scope, design style, budget range, timeline, permits, and construction priorities.";
      const secondReply =
        "The best next step is to schedule a video call with our Architect and Engineer so Monark can understand your goals and help you dimension the project correctly.";
      addMessage({ sender: "bot", text: firstReply }, "none");
      remember("assistant", firstReply);
      addMessage({ sender: "bot", text: secondReply }, "none");
      remember("assistant", secondReply);
      addMessage({ sender: "scheduler", language: "en" }, "start");
      setState("success");
      audio.play("success");
    }, 500);
  }

  return (
    <>
      <main className="blank-page" aria-label="Dingo assistant widget" />
      <aside className="dingo-widget" data-state={avatarState} aria-live="polite">
        <div className={`context-nudge ${nudge ? "visible" : ""} ${nudgeSweeping ? "sweeping" : ""}`} role="status">
          {nudge}
        </div>
        {showStartHint && <div className="start-hint">Click Dingo to start</div>}

        <button className={`dingo-bubble ${isMoodChanging ? "mood-changing" : ""}`} type="button" aria-label={isOpen ? "Close chat with Dingo" : "Open chat with Dingo"} onClick={isOpen ? closePanel : openPanel}>
          <span className="status-ring" />
          <span className="avatar-stack" aria-hidden="true">
            {previousAvatarState && <img className="avatar-layer avatar-previous" src={avatarPath(previousAvatarState)} alt="" />}
            <img className="avatar-layer avatar-current" src={avatarPath(displayAvatarState)} alt="" />
          </span>
          <span className="sr-only">{`Dingo ${STATES[displayAvatarState].label} state`}</span>
          <span className="notification-dot" />
        </button>

        <section className={`chat-panel ${isOpen ? "open" : ""}`} aria-label="Chat with Dingo">
          <header className="chat-header">
            <div className="assistant-card">
              <img className="header-logo" src="/assets/monark-logo-round.png" alt="Monark logo" />
              <div>
                <p>Monark Guide</p>
                <span>
                  <i /> Online
                </span>
              </div>
            </div>
            <button className="icon-button" type="button" aria-label="Close chat" onClick={closePanel}>
              x
            </button>
          </header>

          <div className="chat-messages" ref={messagesRef}>
            <WelcomeCard />
            {messages.map((message, index) => {
              if (message.sender === "typing") return <TypingMessage key={message.id || index} />;
              if (message.sender === "scheduler") {
                return (
                  <article className="message bot schedule-message" data-message-index={index} key={`scheduler-${index}`}>
                    <Scheduler bookings={bookings} language={message.language} onBook={bookVideoCall} />
                  </article>
                );
              }
              return (
                <div data-message-index={index} key={`${message.sender}-${index}`}>
                  <TextMessage message={message} />
                </div>
              );
            })}
          </div>

          <div className="quick-actions" aria-label="Frequently asked questions">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => {
                  openPanel();
                  submitPrompt(action.prompt);
                }}
              >
                {action.label}
              </button>
            ))}
          </div>

          <form
            className="chat-form"
            onSubmit={(event) => {
              event.preventDefault();
              submitPrompt(input);
            }}
          >
            <input
              aria-label="Message for Dingo"
              autoComplete="off"
              placeholder="Ask me anything, press Enter"
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                setIsTyping(Boolean(event.target.value.trim()));
                setState(event.target.value.trim() ? "excited" : "listening");
              }}
              onFocus={() => setState(input.trim() ? "excited" : "listening")}
            />
          </form>

          <button
            className="contact-us-button"
            type="button"
            onClick={() => {
              setContactOpen((current) => !current);
              setState(contactOpen ? "listening" : "excited");
            }}
          >
            <span aria-hidden="true">▣</span>
            Contact us
          </button>
          <div className={`contact-menu ${contactOpen ? "open" : ""}`} aria-label="Contact options">
            <button
              type="button"
              onClick={() => {
                setContactOpen(false);
                submitPrompt("Schedule a video call with our Architect and Engineer.");
              }}
            >
              <span aria-hidden="true">▣</span>
              Schedule a video call
            </button>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
              <span aria-hidden="true">◉</span>
              Send WhatsApp
            </a>
            <a href={`mailto:${MONARK_EMAIL}`}>
              <span aria-hidden="true">@</span>
              Send Email
            </a>
          </div>
          <p className="chat-footer">Monark Design Build · Costa Rica</p>
        </section>
      </aside>

      <ProjectPopover
        visible={popoverVisible}
        onClose={() => setPopoverVisible(false)}
        onSubmit={handleProjectPopoverSubmit}
      />
    </>
  );
}
