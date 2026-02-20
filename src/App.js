import React, { useEffect, useMemo, useRef, useState } from "react";
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
  const [nameIndex, setNameIndex] = useState(0);
  const [screen, setScreen] = useState("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiStatus, setAiStatus] = useState("idle");
  const [aiFooter, setAiFooter] = useState("");
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

    const run = async () => {
      setAiStatus("loading");
      logEvent("ai_request_start", { nickname, questionCount: questionSet.length });
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
          throw new Error(errorText || "Summarization failed");
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
        if (controller.signal.aborted) {
          setAiStatus("idle");
          return;
        }
        setAiStatus("error");
        logEvent("ai_request_error", err?.message || "unknown");
      }
    };

    run();

    return () => controller.abort();
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
    lastRequestKeyRef.current = null;
    setQuestionSet(pickRandomQuestions());
    setScreen("intro");
    logEvent("restart");
  };

  const handleRetrySummary = () => {
    setAiSummary(null);
    setAiFooter("");
    setAiStatus("idle");
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
              Answer a few gentle questions and I will turn your words into a
              sweet little portrait of you and us.
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
                <p>AI summary could not load right now.</p>
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
