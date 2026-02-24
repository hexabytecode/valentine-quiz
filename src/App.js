import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const NAMES = ["GirlyPop", "TikuBadmash", "PottyMaster", "BabluBhai", "GubluBhai"];

const QUESTION_POOL = [
  {
    id: "q1",
    prompt:
      "What's the quickest activity with an \"ahh, I'm comfy\" vibe for you?",
    placeholder: "A vibe, a feeling, a tiny detail...",
  },
  {
    id: "q2",
    prompt: "What's something people often get wrong about you at first?",
    placeholder: "Something they misunderstand...",
  },
  {
    id: "q3",
    prompt: "What's a random memory that still makes you smile for no reason?",
    placeholder: "A small moment that lives in your head...",
  },
  {
    id: "q4",
    prompt: "What's your tiny 'reset' ritual when you've had a bad day?",
    placeholder: "A tiny habit that helps you feel okay again...",
  },
  {
    id: "q5",
    prompt:
      "If we disappeared for a day - no phones, no responsibilities - what would our day look like?",
    placeholder: "Paint the day for me...",
  },
  {
    id: "q6",
    prompt:
      "What kind of compliments actually hit you emotionally, not just sound nice?",
    placeholder: "The kind that stay with you...",
  },
  {
    id: "q7",
    prompt:
      "When do you feel most confident and 'glowing', not just physically but as a person?",
    placeholder: "A moment when you feel fully you...",
  },
  {
    id: "q8",
    prompt: "What makes you feel safe enough to really trust someone?",
    placeholder: "The signal that feels safe...",
  },
  {
    id: "q9",
    prompt: "What's something you wish people were more curious to ask you about?",
    placeholder: "A part of you that deserves attention...",
  },
  {
    id: "q10",
    prompt: "What's one experience you'd love for us to create together someday?",
    placeholder: "A memory we'd create together...",
  },
  {
    id: "q11",
    prompt:
      "Is there a fear you don't usually say out loud but it's quietly there?",
    placeholder: "Only if you want to share...",
  },
  {
    id: "q12",
    prompt: "When do you feel closest to me?",
    placeholder: "A moment, a feeling, a habit...",
  },
  {
    id: "q13",
    prompt:
      "What's one thing you'd always want your partner to truly understand about you?",
    placeholder: "What you want to be understood for...",
  },
  {
    id: "q14",
    prompt:
      "Be honest - is there something I do that you appreciate but haven't told me yet?",
    placeholder: "Something you notice...",
  },
  {
    id: "q15",
    prompt:
      "Fast forward 10 years - what does a lazy Sunday together look like for us?",
    placeholder: "A future Sunday, soft and slow...",
  },
];

const MAX_ANSWER_CHARS = 180;
const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/$/, "");
const SUMMARY_TIMEOUT_MS = Number(
  process.env.REACT_APP_SUMMARY_TIMEOUT_MS || 90000
);
const GATE_STORAGE_KEY = "valentine_gate_completed_at";
const GATE_COOLDOWN_MS = 60 * 60 * 1000;
const GATE_WORD = ["M", "O", "N", "E", "Y"];

const LOADING_MESSAGES = [
  "Gathering your words into trouble...",
  "This takes a minute, your chaos is loading...",
  "Almost there... polishing the banter.",
  "Still cooking. It will be worth it.",
  "Hang tight, we're making it personal...",
  "Final touches. Don't go anywhere.",
];

const pickRandomQuestions = (count = 3) => {
  const copy = [...QUESTION_POOL];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
};


function KineticWord({ text }) {
  return (
    <span className="kinetic-word" aria-label={text}>
      {text.split("").map((char, index) => (
        <span
          key={`${char}-${index}`}
          className="kinetic-letter"
          style={{ "--i": index }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
}

function renderBold(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`b-${index}`}>{part.slice(2, -2)}</strong>
      );
    }
    return <span key={`t-${index}`}>{part}</span>;
  });
}

export default function App() {
  const [gateOpen, setGateOpen] = useState(true);
  const [gateStatus, setGateStatus] = useState("input");
  const [gateTimeLeft, setGateTimeLeft] = useState(60);
  const [gateOtp, setGateOtp] = useState(Array(5).fill(""));
  const [gateLocked, setGateLocked] = useState(Array(5).fill(false));
  const [gateError, setGateError] = useState("");
  const [gateShake, setGateShake] = useState(false);
  const [gateGuessedMouth, setGateGuessedMouth] = useState(false);
  const [gateResetting, setGateResetting] = useState(false);
  const gateRefs = useRef([]);
  const gateRevealTimers = useRef([]);

  const [nameIndex, setNameIndex] = useState(0);
  const [screen, setScreen] = useState("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiStatus, setAiStatus] = useState("idle");
  const [aiFooter, setAiFooter] = useState("");
  const [aiErrorMessage, setAiErrorMessage] = useState("");
  const [nickname, setNickname] = useState(NAMES[0]);
  const [retryToken, setRetryToken] = useState(0);
  const [debugEvents, setDebugEvents] = useState([]);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [questionSet, setQuestionSet] = useState(() => pickRandomQuestions());
  const appRef = useRef(null);
  const loadingTimerRef = useRef(null);
  const lastRequestKeyRef = useRef(null);

  const debugEnabled = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).has("debug");
  }, []);

  const logEvent = React.useCallback(
    (label, detail) => {
      if (!debugEnabled) return;
      const entry = {
        time: new Date().toISOString(),
        label,
        detail,
      };
      setDebugEvents((prev) => [...prev.slice(-25), entry]);
      // eslint-disable-next-line no-console
      console.log("[debug]", label, detail || "");
    },
    [debugEnabled]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(GATE_STORAGE_KEY);
    if (!stored) {
      setGateOpen(true);
      return;
    }
    const parsed = Number(stored);
    if (!Number.isFinite(parsed)) {
      setGateOpen(true);
      return;
    }
    if (Date.now() - parsed < GATE_COOLDOWN_MS) {
      setGateOpen(false);
    } else {
      setGateOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!gateOpen) return;
    setGateStatus("input");
    setGateTimeLeft(60);
    setGateOtp(Array(5).fill(""));
    setGateLocked(Array(5).fill(false));
    setGateError("");
    setGateShake(false);
    setGateResetting(false);
    setGateGuessedMouth(false);
    gateRevealTimers.current.forEach((timer) => clearTimeout(timer));
    gateRevealTimers.current = [];
    requestAnimationFrame(() => {
      gateRefs.current[0]?.focus();
    });
  }, [gateOpen]);

  useEffect(() => {
    if (!gateOpen || gateStatus !== "input") return;
    const timer = setInterval(() => {
      setGateTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gateOpen, gateStatus]);

  useEffect(() => {
    if (!gateOpen || gateStatus !== "input") return;
    if (gateTimeLeft === 40) {
      setGateOtp((prev) => {
        const next = [...prev];
        next[1] = "O";
        return next;
      });
      setGateLocked((prev) => {
        const next = [...prev];
        next[1] = true;
        return next;
      });
    }
    if (gateTimeLeft === 20) {
      setGateOtp((prev) => {
        const next = [...prev];
        next[0] = "M";
        return next;
      });
      setGateLocked((prev) => {
        const next = [...prev];
        next[0] = true;
        return next;
      });
    }
    if (gateTimeLeft === 0) {
      setGateStatus("revealing");
    }
  }, [gateOpen, gateStatus, gateTimeLeft]);

  useEffect(() => {
    if (!gateOpen || gateStatus !== "revealing") return;
    setGateOtp(Array(5).fill(""));
    setGateLocked(Array(5).fill(true));
    gateRevealTimers.current.forEach((timer) => clearTimeout(timer));
    gateRevealTimers.current = GATE_WORD.map((letter, index) =>
      setTimeout(() => {
        setGateOtp((prev) => {
          const next = [...prev];
          next[index] = letter;
          return next;
        });
        if (index === GATE_WORD.length - 1) {
          setGateStatus("revealed");
        }
      }, index * 220)
    );
    return () => {
      gateRevealTimers.current.forEach((timer) => clearTimeout(timer));
      gateRevealTimers.current = [];
    };
  }, [gateOpen, gateStatus]);

  const getNextEditableIndex = useCallback(
    (start) => {
      for (let i = start; i < gateLocked.length; i += 1) {
        if (!gateLocked[i]) return i;
      }
      return gateLocked.length - 1;
    },
    [gateLocked]
  );

  const getPrevEditableIndex = useCallback(
    (start) => {
      for (let i = start; i >= 0; i -= 1) {
        if (!gateLocked[i]) return i;
      }
      return 0;
    },
    [gateLocked]
  );

  const handleGateInput = (index, value) => {
    if (gateStatus !== "input") return;
    setGateError("");
    if (gateLocked[index]) {
      const nextIndex = getNextEditableIndex(index + 1);
      gateRefs.current[nextIndex]?.focus();
      return;
    }
    const letter = value.replace(/[^a-zA-Z]/g, "").toUpperCase();
    if (!letter) {
      setGateOtp((prev) => {
        const next = [...prev];
        next[index] = "";
        return next;
      });
      return;
    }
    setGateOtp((prev) => {
      const next = [...prev];
      next[index] = letter[0];
      return next;
    });
    const nextIndex = getNextEditableIndex(index + 1);
    gateRefs.current[nextIndex]?.focus();
  };

  const handleGateKeyDown = (index, event) => {
    if (gateStatus !== "input") return;
    if (event.key === "Backspace") {
      setGateError("");
      if (gateLocked[index]) {
        const prevIndex = getPrevEditableIndex(index - 1);
        gateRefs.current[prevIndex]?.focus();
        return;
      }
      if (gateOtp[index]) {
        setGateOtp((prev) => {
          const next = [...prev];
          next[index] = "";
          return next;
        });
      } else if (index > 0) {
        const prevIndex = getPrevEditableIndex(index - 1);
        gateRefs.current[prevIndex]?.focus();
        setGateOtp((prev) => {
          const next = [...prev];
          if (!gateLocked[prevIndex]) {
            next[prevIndex] = "";
          }
          return next;
        });
      }
    }
  };

  const handleGatePaste = (event, startIndex) => {
    if (gateStatus !== "input") return;
    setGateError("");
    const text = event.clipboardData.getData("text").replace(/[^a-zA-Z]/g, "").toUpperCase();
    if (!text) return;
    event.preventDefault();
    const editableIndexes = [];
    for (let i = startIndex; i < 5; i += 1) {
      if (!gateLocked[i]) editableIndexes.push(i);
    }
    const letters = text.slice(0, editableIndexes.length).split("");
    setGateOtp((prev) => {
      const next = [...prev];
      letters.forEach((char, idx) => {
        next[editableIndexes[idx]] = char;
      });
      return next;
    });
    const nextIndex =
      editableIndexes[letters.length - 1] !== undefined
        ? Math.min(editableIndexes[letters.length - 1] + 1, 4)
        : startIndex;
    gateRefs.current[getNextEditableIndex(nextIndex)]?.focus();
  };

  useEffect(() => {
    if (!gateOpen || gateStatus !== "input") return;
    if (gateOtp.every((char) => char)) {
      const attempt = gateOtp.join("");
      if (attempt === "MOUTH") {
        setGateGuessedMouth(true);
      }
      setGateError("Not quite. Try again. 😔");
      setGateShake(true);
      setGateResetting(false);
      const fadeTimer = setTimeout(() => {
        setGateResetting(true);
      }, 1000);
      const clearTimer = setTimeout(() => {
        clearTimeout(fadeTimer);
        setGateShake(false);
        setGateError("");
        setGateOtp((prev) =>
          prev.map((char, idx) => (gateLocked[idx] ? char : ""))
        );
        setGateResetting(false);
        gateRefs.current[getNextEditableIndex(0)]?.focus();
      }, 1500);
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(clearTimer);
      };
    }
  }, [gateOpen, gateStatus, gateOtp, gateLocked, getNextEditableIndex]);

  const handleGateContinue = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(GATE_STORAGE_KEY, String(Date.now()));
    }
    setGateOpen(false);
  };


  useEffect(() => {
    const interval = setInterval(() => {
      setNameIndex((prev) => (prev + 1) % NAMES.length);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const node = appRef.current;
    if (!node) return;

    const target = { x: 50, y: 50 };
    const current = { x: 50, y: 50 };
    let rafId;

    const render = () => {
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      node.style.setProperty("--mx", `${current.x}%`);
      node.style.setProperty("--my", `${current.y}%`);
      rafId = requestAnimationFrame(render);
    };

    const handleMove = (event) => {
      const { clientX, clientY } = event;
      target.x = (clientX / window.innerWidth) * 100;
      target.y = (clientY / window.innerHeight) * 100;
    };

    const handleTouch = (event) => {
      if (!event.touches?.[0]) return;
      const touch = event.touches[0];
      target.x = (touch.clientX / window.innerWidth) * 100;
      target.y = (touch.clientY / window.innerHeight) * 100;
    };

    render();
    window.addEventListener("mousemove", handleMove, { passive: true });
    window.addEventListener("touchmove", handleTouch, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleTouch);
    };
  }, []);

  const currentName = NAMES[nameIndex];
  const question = questionSet[step];
  const getFriendlyErrorMessage = ({ didTimeout, status }) => {
    if (didTimeout || status === 504) {
      return "That took longer than usual. Tap retry and we'll try again.";
    }
    if (status === 429) {
      return "Too many requests at once. Take a breath and try again.";
    }
    if (status === 401 || status === 403) {
      return "We couldn't verify the service right now. Try again in a minute.";
    }
    if (status && status >= 500) {
      return "The servers are being moody. Give it a moment and retry.";
    }
    return "We hit a small snag. Try again and it'll behave.";
  };

  useEffect(() => {
    if (screen !== "summary") return;
    if (aiSummary) return;
    const requestKey = JSON.stringify({
      answers,
      nickname,
      questionCount: questionSet.length,
      retryToken,
    });
    if (lastRequestKeyRef.current === requestKey) return;
    lastRequestKeyRef.current = requestKey;

    const controller = new AbortController();
    let timeoutId;
    let didTimeout = false;

    const run = async () => {
      setAiStatus("loading");
      setAiErrorMessage("");
      logEvent("ai_request_start", { nickname, questionCount: questionSet.length });
      timeoutId = setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, SUMMARY_TIMEOUT_MS);
      try {
        const response = await fetch(`${API_BASE_URL}/api/summarize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers,
            questions: questionSet.map((q) => ({ id: q.id, prompt: q.prompt })),
            nickname,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          const err = new Error(errorText || "Summarization failed");
          err.status = response.status;
          throw err;
        }

        const data = await response.json();
        if (!data?.roast_note || !data?.spirit_emoji) {
          throw new Error("Incomplete AI response");
        }

        setAiSummary(data);
        setAiFooter(data.footer_line || "");
        setAiStatus("done");
        logEvent("ai_request_success", { length: data.roast_note?.length || 0 });
      } catch (err) {
        if (controller.signal.aborted && !didTimeout) {
          setAiStatus("idle");
          return;
        }
        setAiStatus("error");
        setAiErrorMessage(
          getFriendlyErrorMessage({ didTimeout, status: err?.status })
        );
        logEvent("ai_request_error", didTimeout ? "timeout" : err?.message || "unknown");
      } finally {
        clearTimeout(timeoutId);
      }
    };

    run();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [screen, answers, nickname, questionSet, aiSummary, retryToken, logEvent]);

  useEffect(() => {
    if (aiStatus !== "loading") {
      clearInterval(loadingTimerRef.current);
      loadingTimerRef.current = null;
      return;
    }

    if (loadingTimerRef.current) return;

    loadingTimerRef.current = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 20000);

    return () => {
      clearInterval(loadingTimerRef.current);
      loadingTimerRef.current = null;
    };
  }, [aiStatus]);


  const handleStart = () => {
    setNickname(currentName);
    lastRequestKeyRef.current = null;
    setAiSummary(null);
    setAiFooter("");
    setAiStatus("idle");
    setAiErrorMessage("");
    setQuestionSet(pickRandomQuestions());
    setAnswers({});
    setScreen("question");
    setStep(0);
    logEvent("start", { nickname: currentName });
  };

  const handleText = (questionId, value) => {
    const trimmed = value.slice(0, MAX_ANSWER_CHARS);
    setAnswers((prev) => ({ ...prev, [questionId]: trimmed }));
    logEvent("answer_change", { questionId, length: value.length });
  };

  const canContinue = useMemo(() => {
    if (!question) return false;
    const answer = answers[question.id];
    return Boolean(answer && answer.trim().length > 0);
  }, [answers, question]);

  const handleNext = () => {
    if (!canContinue) return;
    setIsTransitioning(true);
    logEvent("next", { step });
    setTimeout(() => {
      setIsTransitioning(false);
      if (step >= questionSet.length - 1) {
        setScreen("summary");
      } else {
        setStep((prev) => prev + 1);
      }
    }, 650);
  };

  const handleBack = () => {
    if (step === 0) {
      setAnswers({});
      setStep(0);
      setAiSummary(null);
      setAiFooter("");
      setAiStatus("idle");
      setAiErrorMessage("");
      lastRequestKeyRef.current = null;
      setScreen("intro");
    } else {
      setStep((prev) => Math.max(prev - 1, 0));
    }
    logEvent("back", { step });
  };

  const handleRestart = () => {
    setAnswers({});
    setStep(0);
    setAiSummary(null);
    setAiFooter("");
    setAiStatus("idle");
    setAiErrorMessage("");
    lastRequestKeyRef.current = null;
    setQuestionSet(pickRandomQuestions());
    setScreen("intro");
    logEvent("restart");
  };

  const handleRetrySummary = () => {
    setAiSummary(null);
    setAiFooter("");
    setAiStatus("idle");
    setAiErrorMessage("");
    lastRequestKeyRef.current = null;
    setRetryToken((prev) => prev + 1);
    logEvent("ai_retry");
  };

  const runDebugTest = (answerText) => {
    const firstId = questionSet[0]?.id || "q1";
    setAnswers({ [firstId]: answerText });
    setNickname(currentName);
    setScreen("summary");
    lastRequestKeyRef.current = null;
    setAiSummary(null);
    setAiFooter("");
    setAiStatus("idle");
    setAiErrorMessage("");
    setRetryToken((prev) => prev + 1);
    logEvent("debug_test", { answer: answerText.slice(0, 40) });
  };

  const roastNote = aiSummary?.roast_note || "";
  const spiritEmoji = aiSummary?.spirit_emoji || "";
  const spiritLine = aiSummary?.spirit_line || "";
  const callbacksUsed = aiSummary?.callbacks_used || [];
  const footerLine = aiFooter || "";

  return (
    <div className="app" ref={appRef}>
      {gateOpen && (
        <div className="gate-overlay" role="dialog" aria-modal="true">
          <div className="gate-card">
            <p className="gate-eyebrow">A quick gate</p>
            <h2 className="gate-title">Unlock your valentine website</h2>
            <p className="gate-question">I love how you use your</p>
            <div
              className={`gate-otp ${gateShake ? "gate-otp--shake" : ""} ${
                gateResetting ? "gate-otp--reset" : ""
              }`}
              aria-label="5 letter word input"
            >
              {gateOtp.map((value, index) => (
                <input
                  key={`gate-${index}`}
                  ref={(el) => {
                    gateRefs.current[index] = el;
                  }}
                  className={`gate-box ${
                    gateStatus !== "input" ? "gate-box--revealed" : ""
                  } ${gateLocked[index] ? "gate-box--locked" : ""}`}
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  maxLength={1}
                  value={value}
                  onChange={(event) => handleGateInput(index, event.target.value)}
                  onKeyDown={(event) => handleGateKeyDown(index, event)}
                  onPaste={(event) => handleGatePaste(event, index)}
                  disabled={gateStatus !== "input" || gateLocked[index]}
                  aria-label="5 letter word input"
                />
              ))}
            </div>
            <div className="gate-hint">
              {gateError && (
                <span
                  className={`gate-error-inline ${
                    gateResetting ? "gate-error-inline--fade" : ""
                  }`}
                >
                  {gateError}
                </span>
              )}
              {gateError && <span className="gate-dot">•</span>}
              <span className="gate-timer">
                {String(Math.floor(gateTimeLeft / 60)).padStart(2, "0")}:
                {String(gateTimeLeft % 60).padStart(2, "0")}
              </span>
            </div>
            {gateStatus === "revealed" && (
              <div className="gate-reveal">
                <p className="gate-reveal-primary">
                  {gateGuessedMouth
                    ? (
                      <>
                        your mind went somewhere else, huh? good girl.{" "}
                        <span className="gate-emoji">😏</span>
                      </>
                    )
                    : (
                      <>
                        someone has been behaving too nice. let me make a bad student out of her{" "}
                        <span className="gate-emoji">😈</span>
                      </>
                    )}
                </p>
                <button
                  type="button"
                  className="btn primary"
                  onClick={handleGateContinue}
                >
                  continue
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="backdrop" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <div className="floaters" aria-hidden="true">
        <span className="blob blob-1" />
        <span className="blob blob-2" />
        <span className="blob blob-3" />
      </div>

      {isTransitioning && (
        <div className="transition" aria-hidden="true">
          <div className="transition-card">
            <span className="transition-dot" />
            <span className="transition-text">
              Turning your words into warmth
            </span>
          </div>
        </div>
      )}

      {screen === "intro" && (
        <section className="screen hero">
          <div className="hero-content">
            <p className="eyebrow">A soft invitation</p>
            <h1 className="title">
              <span className="title-stack">
                <span className="title-main">
                  <KineticWord text="VALENTINE" />
                </span>
                <span className="title-shadow" aria-hidden="true">
                  VALENTINE
                </span>
              </span>
              <span className="title-stack">
                <span className="title-main">QUIZ</span>
                <span className="title-shadow" aria-hidden="true">
                  QUIZ
                </span>
              </span>
            </h1>
            <p className="name-focus">
              For <span key={currentName} className="name-swap">{currentName}</span>
            </p>
            <p className="subtitle">
              <span className="subtitle-line">
                Valentine’s is on 14/02 for kids.
              </span>
              <span className="subtitle-line">
                Grown‑ups celebrate it with a delay.
              </span>
              <span className="subtitle-aside">
                (is something people say when they're late @ gift giving)
              </span>
            </p>
            <div className="cta-row">
              <button className="btn primary" type="button" onClick={handleStart}>
                Start the quiz
              </button>
            </div>
            <div className="hero-meta">
              <span>{questionSet.length} questions</span>
              <span>2 minutes</span>
              <span>Just you + me</span>
            </div>
          </div>
        </section>
      )}

      {screen === "question" && question && (
        <section className="screen question">
          <div
            className={`question-card ${
              isTransitioning ? "question-card--exit" : "question-card--enter"
            }`}
            key={question.id}
          >
            <div className="progress">
              <span>
                Question {step + 1} of {questionSet.length}
              </span>
              <div className="progress-bar">
                <span
                  style={{
                    width: `${((step + 1) / questionSet.length) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className="question-header">
              <h2 className="question-title">{question.prompt}</h2>
              <p>Take your time. A few words is perfect.</p>
            </div>
            <textarea
              rows={4}
              aria-label={question.prompt}
              placeholder={question.placeholder}
              value={answers[question.id] || ""}
              onChange={(event) => handleText(question.id, event.target.value)}
              maxLength={MAX_ANSWER_CHARS}
            />
            <div className="char-count">
              {(answers[question.id] || "").length}/{MAX_ANSWER_CHARS}
            </div>
            {!canContinue && (
              <p className="question-helper">
                Add a few words so I can keep going.
              </p>
            )}
            <div className="question-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={handleBack}
              >
                Back
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={handleNext}
                disabled={!canContinue}
              >
                {step === questionSet.length - 1 ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </section>
      )}

      {screen === "summary" && (
        <section className="screen summary">
          <div className="summary-card summary-card--enter">
            {spiritEmoji && (
              <div className="summary-hero">
                <div className="summary-emoji">{spiritEmoji}</div>
                {spiritLine && <p className="summary-note">{spiritLine}</p>}
              </div>
            )}
            <p className="summary-eyebrow">Your love note</p>
            {aiStatus === "loading" && (
              <div className="summary-loading">
                <span className="summary-pulse" />
                <span>{LOADING_MESSAGES[loadingMessageIndex]}</span>
              </div>
            )}
            {aiStatus === "error" && (
              <div className="summary-error">
                <p>{aiErrorMessage || "AI summary could not load right now."}</p>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={handleRetrySummary}
                >
                  Retry summary
                </button>
              </div>
            )}
            {aiStatus === "loading" && (
              <div className="summary-ai">
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
                <div className="skeleton-line" />
              </div>
            )}
            {roastNote && aiStatus !== "loading" && (
              <div className="summary-ai">
                <p className="summary-ai-text">{renderBold(roastNote)}</p>
              </div>
            )}
            {debugEnabled && callbacksUsed.length > 0 && (
              <div className="debug-callbacks">
                <span className="summary-label">Callbacks used</span>
                <div className="debug-callback-list">
                  {callbacksUsed.map((item) => (
                    <span key={item} className="debug-chip">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {footerLine && <p className="summary-note">{footerLine}</p>}
            <div className="question-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={handleRestart}
              >
                Retake
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={handleRestart}
              >
                Back to start
              </button>
            </div>
          </div>
        </section>
      )}

      {debugEnabled && (
        <div className="debug-panel">
          <div className="debug-row">
            <span>Screen: {screen}</span>
            <span>Step: {step + 1}</span>
            <span>AI: {aiStatus}</span>
            <button
              type="button"
              className="btn ghost"
              onClick={() => runDebugTest("warm laughs and quiet coffee")}
            >
              Test: cozy
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => runDebugTest("slow mornings, soft teasing, and long hugs")}
            >
              Test: soft
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => runDebugTest("electric banter, late-night walks, bright energy")}
            >
              Test: bright
            </button>
          </div>
          <pre className="debug-log">
            {debugEvents
              .map((event) =>
                `${event.time} | ${event.label} ${event.detail ? JSON.stringify(event.detail) : ""}`.trim()
              )
              .join("\\n")}
          </pre>
        </div>
      )}
    </div>
  );
}
