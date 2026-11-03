/* ============================================================
   Robot chat.

   The 3D companion doubles as a small AI assistant. Answers come
   from Puter.js (https://developer.puter.com), which runs entirely
   in the browser: the site stays static and keeps no API key. It
   uses Puter's user-pays model, so a visitor may be asked to sign
   in to a free Puter account after some usage.

   If Puter cannot be reached the robot still answers common
   questions about Ken from the local table at the bottom.
   ============================================================ */

const COMPANION = document.getElementById("avatar-companion");
const STAGE = document.querySelector(".avatar-stage");
const TOGGLE = document.getElementById("avatar-chat-toggle");
const PANEL = document.getElementById("avatar-chat");
const LOG = document.getElementById("avatar-chat-log");
const FORM = document.getElementById("avatar-chat-form");
const INPUT = document.getElementById("avatar-chat-input");
const CLOSE = document.getElementById("avatar-chat-close");
const VOICE_BTN = document.getElementById("avatar-chat-voice");
const SEND_BTN = document.getElementById("avatar-chat-send");

const PUTER_SRC = "https://js.puter.com/v2/";
const VOICE_KEY = "kc-bot-voice";
const HISTORY_LIMIT = 10;
const MAX_INPUT = 500;

const PROFILE = `Ken Kevin Cabanalan is a third-year BS Information Technology student at
Global Reciprocal Colleges in Caloocan, Philippines, expected to graduate in 2028.
He is open to internships and entry-level developer work.
Languages and markup: HTML, CSS, JavaScript, C++, C#, Dart, Python, PHP, SQL.
Frameworks and platforms: Flutter, Supabase, Firebase, Xendit.
Tools: Git and GitHub, VS Code, Chrome DevTools.
Projects (all on github.com/cosme0): Flutter Payment App (Flutter, Supabase and Xendit,
2026), Systems Architecture Project (PHP system, 2026), BMC Final Project (Flutter,
2026), AI Data Representation, Activity Calendar, and Personal Website v1.
Contact: kenkevincabanalan0@gmail.com. GitHub: https://github.com/cosme0.
Portfolio: https://cosme0.github.io/personal_resume/ (has a downloadable CV).`;

const SYSTEM_PROMPT = `You are KC, the small robot that lives in the corner of Ken Kevin
Cabanalan's portfolio website. You speak for Ken about his work, skills and studies.

Rules:
- Answer in 1 to 3 short sentences. Never use markdown, lists, headings or emoji.
- Speak in first person as Ken's robot helper ("Ken built...", "I can point you to...").
- Only use the facts below. If something is not covered, say you are not sure and
  suggest emailing Ken at kenkevincabanalan0@gmail.com.
- If asked something unrelated to Ken or his work, answer very briefly and steer
  back to his portfolio.
- Never invent employers, salaries, dates, degrees, clients or project details.
- Be warm and concise, like a friendly guide, not a salesperson.

Facts about Ken:
${PROFILE}`;

const FALLBACKS = [
  {
    match: /(skill|stack|tech|language|know|good at|framework|tool)/i,
    reply:
      "Ken works in HTML, CSS and JavaScript on the web, Dart and Flutter on mobile, and Python, PHP, C++, C# and SQL for coursework and systems. He also uses Supabase, Firebase, Xendit, Git and VS Code.",
  },
  {
    match: /(project|built|work|portfolio piece|github repo)/i,
    reply:
      "His main projects are the Flutter Payment App with Supabase and Xendit, a PHP systems architecture project, the BMC Flutter final project, plus an AI data representation piece and an activity calendar — all on github.com/cosme0.",
  },
  {
    match: /(school|study|education|college|course|degree|graduate)/i,
    reply:
      "Ken is in his third year of BS Information Technology at Global Reciprocal Colleges in Caloocan, and expects to graduate in 2028.",
  },
  {
    match: /(contact|email|reach|hire|available|intern|job)/i,
    reply:
      "He is open to internships. The quickest way to reach him is kenkevincabanalan0@gmail.com, or the contact form on this site.",
  },
  {
    match: /(cv|resume|download)/i,
    reply:
      "There is a Download CV button on the home page, and the About page covers his background in more detail.",
  },
  {
    match: /(who|about|you|robot)/i,
    reply:
      "I'm KC, the little robot on Ken's portfolio. Ken is a third-year IT student in Caloocan who builds web and mobile projects.",
  },
];

let history = [];
let busy = false;
let puterPromise = null;
let opened = false;
let pendingQuestion = "";
let signInBubble = null;
let voiceOn = readVoicePref();

/* ----------------------------- Panel ------------------------------ */

function openPanel() {
  if (!PANEL) return;
  PANEL.classList.add("is-open");
  PANEL.setAttribute("aria-hidden", "false");
  TOGGLE?.setAttribute("aria-expanded", "true");
  COMPANION?.classList.add("is-chatting");
  window.clearTimeout(hideTimer);

  if (!opened) {
    opened = true;
    appendMessage(
      "bot",
      "Hey, I'm KC — Ken's robot. Ask me about his skills, projects or how to reach him."
    );
  }

  window.setTimeout(() => INPUT?.focus(), 180);
}

function closePanel() {
  if (!PANEL) return;
  PANEL.classList.remove("is-open");
  PANEL.setAttribute("aria-hidden", "true");
  TOGGLE?.setAttribute("aria-expanded", "false");
  COMPANION?.classList.remove("is-chatting");
  stopSpeaking();
  TOGGLE?.focus({ preventScroll: true });
}

let hideTimer = 0;

function togglePanel() {
  if (PANEL?.classList.contains("is-open")) closePanel();
  else openPanel();
}

/* ---------------------------- Messages ---------------------------- */

function scrollLog() {
  if (!LOG) return;
  LOG.scrollTop = LOG.scrollHeight;
  // Layout of a freshly appended bubble settles a frame later.
  window.requestAnimationFrame(() => {
    LOG.scrollTop = LOG.scrollHeight;
  });
}

function appendMessage(role, text) {
  if (!LOG) return null;

  const bubble = document.createElement("div");
  bubble.className = `ai-msg ai-msg--${role}`;
  const body = document.createElement("p");
  body.textContent = text;
  bubble.appendChild(body);
  LOG.appendChild(bubble);
  scrollLog();
  return bubble;
}

function setMessageText(bubble, text) {
  const body = bubble?.querySelector("p");
  if (!body) return;
  body.textContent = text;
  scrollLog();
}

function showTyping(bubble) {
  const body = bubble?.querySelector("p");
  if (!body) return;
  body.innerHTML = '<span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-dot"></span>';
  body.classList.add("ai-typing");
}

function hideTyping(bubble) {
  bubble?.querySelector("p")?.classList.remove("ai-typing");
}

function setBusy(value) {
  busy = value;
  if (SEND_BTN) SEND_BTN.disabled = value;
  if (INPUT) INPUT.disabled = value;
}

/* ---------------------------- Answering --------------------------- */

function loadPuter() {
  if (window.puter?.ai?.chat) return Promise.resolve(window.puter);
  if (puterPromise) return puterPromise;

  puterPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PUTER_SRC;
    script.async = true;
    script.onload = () => {
      if (!window.puter?.ai?.chat) {
        reject(new Error("Puter loaded without the AI API"));
        return;
      }
      // Hide Puter's console banner; it is not useful to visitors.
      window.puter.quiet = true;
      resolve(window.puter);
    };
    script.onerror = () => reject(new Error("Could not load Puter.js"));
    document.head.appendChild(script);
  }).catch((error) => {
    puterPromise = null;
    throw error;
  });

  return puterPromise;
}

function extractText(result) {
  if (!result) return "";
  if (typeof result === "string") return result;
  if (typeof result.text === "string") return result.text;
  const content = result.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : part?.text || ""))
      .join("");
  }
  return "";
}

async function askAI(messages, onChunk) {
  const puter = await loadPuter();

  // Puter answers through the visitor's own free Puter account. Ask them to
  // sign in once instead of leaving the request hanging.
  let signedIn = false;
  try {
    signedIn = await puter.auth.isSignedIn();
  } catch {
    signedIn = false;
  }
  if (!signedIn) {
    const error = new Error("sign-in required");
    error.code = "SIGN_IN_REQUIRED";
    throw error;
  }

  const payload = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages,
  ];

  // Prefer streaming so the answer types itself out.
  try {
    const stream = await withTimeout(puter.ai.chat(payload, { stream: true }), 25000);

    if (stream && typeof stream[Symbol.asyncIterator] === "function") {
      let full = "";
      for await (const part of stream) {
        const chunk = extractText(part);
        if (!chunk) continue;
        full += chunk;
        onChunk(full);
      }
      if (full.trim()) return full.trim();
    } else {
      const text = extractText(stream).trim();
      if (text) return text;
    }
  } catch (error) {
    console.warn("[robot] Streaming answer failed, retrying once.", error);
  }

  const result = await withTimeout(puter.ai.chat(payload), 25000);
  const text = extractText(result).trim();
  if (!text) throw new Error("Empty answer");
  return text;
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error("Timed out")), ms);
    }),
  ]);
}

/* --------------------------- Sign-in CTA -------------------------- */

function showSignInPrompt(question) {
  if (!LOG) return;
  if (signInBubble) {
    pendingQuestion = question;
    return;
  }

  pendingQuestion = question;

  const bubble = document.createElement("div");
  bubble.className = "ai-msg ai-msg--bot ai-msg--signin";

  const text = document.createElement("p");
  text.textContent =
    "My AI answers run on a free Puter account, so I need you to sign in first. It takes a few seconds — or just ask me about Ken's skills, projects and contact details and I'll answer from his page.";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "ai-signin-btn";
  button.textContent = "Sign in to chat";
  button.addEventListener("click", () => startSignIn(button));

  bubble.append(text, button);
  LOG.appendChild(bubble);
  scrollLog();
  signInBubble = bubble;
}

async function startSignIn(button) {
  button.disabled = true;
  button.textContent = "Opening sign-in…";

  try {
    const puter = await loadPuter();
    const signedIn = await withTimeout(puter.auth.signIn(), 120000);
    if (!signedIn) throw new Error("Sign-in cancelled");

    signInBubble?.remove();
    signInBubble = null;

    const question = pendingQuestion;
    pendingQuestion = "";
    if (question) send(question);
  } catch (error) {
    console.warn("[robot] Puter sign-in failed.", error);
    button.disabled = false;
    button.textContent = "Try sign-in again";
  }
}

function fallbackAnswer(question) {
  const hit = FALLBACKS.find((entry) => entry.match.test(question));
  return (
    hit?.reply ||
    "I couldn't reach my AI brain just now. The short version: Ken is a third-year IT student in Caloocan who builds web and mobile projects — email kenkevincabanalan0@gmail.com to reach him."
  );
}

/* ------------------------------ Speech ---------------------------- */

function readVoicePref() {
  try {
    return window.localStorage.getItem(VOICE_KEY) === "on";
  } catch {
    return false;
  }
}

function storeVoicePref(value) {
  try {
    window.localStorage.setItem(VOICE_KEY, value ? "on" : "off");
  } catch {
    /* Private mode, ignore. */
  }
}

function syncVoiceButton() {
  if (!VOICE_BTN) return;
  VOICE_BTN.setAttribute("aria-pressed", String(voiceOn));
  VOICE_BTN.classList.toggle("is-on", voiceOn);
  VOICE_BTN.title = voiceOn ? "Mute the robot" : "Let the robot speak";
}

function dispatchSpeaking(speaking) {
  window.dispatchEvent(
    new CustomEvent("avatar:speak", { detail: { speaking } })
  );
}

function spokenVersion(text) {
  return text
    .replace(/[*_`#>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 420);
}

function speak(text) {
  if (!voiceOn || !("speechSynthesis" in window)) return;

  const clean = spokenVersion(text);
  if (!clean) return;

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = 1.04;
  utterance.pitch = 1.25;
  utterance.volume = 0.95;

  const voices = window.speechSynthesis.getVoices();
  utterance.voice =
    voices.find((voice) => /en[-_](US|GB)/i.test(voice.lang) && /google/i.test(voice.name)) ||
    voices.find((voice) => /^en/i.test(voice.lang)) ||
    null;

  utterance.onstart = () => dispatchSpeaking(true);
  utterance.onend = () => dispatchSpeaking(false);
  utterance.onerror = () => dispatchSpeaking(false);

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  dispatchSpeaking(false);
}

/* ------------------------------- Send ----------------------------- */

async function send(text) {
  const question = text.trim().slice(0, MAX_INPUT);
  if (!question || busy) return;

  hideTimer = 0;
  setBusy(true);
  appendMessage("user", question);
  if (INPUT) INPUT.value = "";

  const replyBubble = appendMessage("bot", "");
  showTyping(replyBubble);
  dispatchSpeaking(true);

  let answer = "";
  try {
    answer = await askAI(history.concat({ role: "user", content: question }), (partial) => {
      hideTyping(replyBubble);
      setMessageText(replyBubble, partial);
    });
  } catch (error) {
    if (error?.code === "SIGN_IN_REQUIRED") {
      showSignInPrompt(question);
    } else {
      console.warn("[robot] Falling back to local answers.", error);
    }
    answer = fallbackAnswer(question);
  }

  hideTyping(replyBubble);
  setMessageText(replyBubble, answer);

  history.push({ role: "user", content: question });
  history.push({ role: "assistant", content: answer });
  if (history.length > HISTORY_LIMIT) history = history.slice(-HISTORY_LIMIT);

  setBusy(false);
  if (INPUT) INPUT.focus({ preventScroll: true });

  // The robot mouths the answer, and shows a short version in its bubble.
  window.dispatchEvent(
    new CustomEvent("avatar:say", {
      detail: { message: shortLine(answer), duration: 4200 },
    })
  );

  if (voiceOn) speak(answer);
  else dispatchSpeaking(false);
}

function shortLine(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 120) return clean;
  return `${clean.slice(0, 117).trimEnd()}…`;
}

/* ------------------------------ Wiring ---------------------------- */

TOGGLE?.addEventListener("click", togglePanel);
CLOSE?.addEventListener("click", closePanel);
STAGE?.addEventListener("click", togglePanel);

FORM?.addEventListener("submit", (event) => {
  event.preventDefault();
  send(INPUT?.value || "");
});

INPUT?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    send(INPUT.value);
  }
});

VOICE_BTN?.addEventListener("click", () => {
  voiceOn = !voiceOn;
  storeVoicePref(voiceOn);
  syncVoiceButton();
  if (!voiceOn) stopSpeaking();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && PANEL?.classList.contains("is-open")) {
    closePanel();
  }
});

// Warm the voice list on browsers that load it asynchronously.
if ("speechSynthesis" in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", () => {
    window.speechSynthesis.getVoices();
  });
}

syncVoiceButton();

// Greet visitors once the page is idle, so the chat is discoverable.
window.addEventListener("load", () => {
  window.setTimeout(() => {
    if (opened) return;
    window.dispatchEvent(
      new CustomEvent("avatar:say", {
        detail: {
          message: "Tap me — I can answer questions about Ken.",
          duration: 5000,
        },
      })
    );
  }, 2600);
});

export { openPanel, closePanel };
