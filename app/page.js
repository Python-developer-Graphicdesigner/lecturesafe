"use client";

import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "lecturesafe:lectures";

function loadLectures() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLectures(lectures) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lectures));
  } catch {}
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Home() {
  const [isOnline, setIsOnline] = useState(true);
  const [lectures, setLectures] = useState([]);
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [aiLoadingId, setAiLoadingId] = useState(null);
  const [aiErrorId, setAiErrorId] = useState(null);

  useEffect(() => {
    setLectures(loadLectures());
    setIsOnline(window.navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const persist = useCallback((next) => {
    setLectures(next);
    saveLectures(next);
  }, []);

  function handleAdd(e) {
    e.preventDefault();
    if (!title.trim() || !notes.trim()) return;
    const entry = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      title: title.trim(),
      subject: subject.trim() || "General",
      notes: notes.trim(),
      createdAt: Date.now(),
      savedOffline: !isOnline,
      ai: null,
    };
    persist([entry, ...lectures]);
    setTitle("");
    setSubject("");
    setNotes("");
  }

  function handleDelete(id) {
    persist(lectures.filter((l) => l.id !== id));
  }

  async function handleSummarize(id) {
    const lecture = lectures.find((l) => l.id === id);
    if (!lecture) return;
    setAiErrorId(null);
    setAiLoadingId(id);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: lecture.title, subject: lecture.subject, notes: lecture.notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Something went wrong");
      const next = lectures.map((l) =>
        l.id === id ? { ...l, ai: data.result } : l
      );
      persist(next);
    } catch (err) {
      setAiErrorId(id);
    } finally {
      setAiLoadingId(null);
    }
  }

  return (
    <div className="wrap">
      <header className="hero">
        <div className="hero-eyebrow">
          <span className={`lamp-dot ${isOnline ? "" : "offline"}`} />
          {isOnline ? "connected" : "offline — writing by lamplight"}
        </div>
        <h1>
          Never lose a lecture <em>to a blackout.</em>
        </h1>
        <p className="sub">
          Type your notes as the lecture happens. LectureSafe saves everything
          on your device instantly — no internet, no electricity, no problem.
          When you're back online, let AI turn your rough notes into a clean
          summary and a quick quiz.
        </p>
        <div className="status-bar">
          {isOnline
            ? "Signal is up — AI summaries are available."
            : "No connection right now — your notes are still saving safely on this device."}
        </div>
      </header>

      <section>
        <div className="section-label">Capture a new lecture</div>
        <form className="card" onSubmit={handleAdd}>
          <div className="row">
            <div className="field">
              <label htmlFor="title">Lecture title</label>
              <input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Thermodynamics — Chapter 4"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="subject">Subject</label>
              <input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Physics"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Jot down whatever you catch — messy is fine, AI will clean it up later."
              required
            />
          </div>
          <button className="btn btn-primary" type="submit">
            Save lecture
          </button>
        </form>
      </section>

      <section>
        <div className="section-label">Your lectures ({lectures.length})</div>

        {lectures.length === 0 ? (
          <div className="empty">
            <div className="glyph">🕯️</div>
            No lectures saved yet. Add your first one above — it'll be here
            even if the power goes out.
          </div>
        ) : (
          lectures.map((lecture) => (
            <article className="lecture" key={lecture.id}>
              <div className="lecture-top">
                <div>
                  <h3 className="lecture-title">{lecture.title}</h3>
                  <div className="lecture-meta">
                    {lecture.subject} · {formatTime(lecture.createdAt)}
                  </div>
                </div>
                {lecture.savedOffline && (
                  <span className="badge saved-offline">saved offline</span>
                )}
              </div>

              <div className="lecture-notes">{lecture.notes}</div>

              <div className="lecture-actions">
                <button
                  className="btn btn-ghost"
                  onClick={() => handleSummarize(lecture.id)}
                  disabled={!isOnline || aiLoadingId === lecture.id}
                  title={!isOnline ? "Connect to the internet to use AI" : ""}
                >
                  {aiLoadingId === lecture.id ? (
                    <>
                      <span className="spinner" /> Summarizing…
                    </>
                  ) : lecture.ai ? (
                    "Re-summarize with AI"
                  ) : (
                    "Summarize with AI"
                  )}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(lecture.id)}
                >
                  Delete
                </button>
              </div>

              {aiErrorId === lecture.id && (
                <div className="error-text">
                  Couldn't reach the AI right now. Your notes are safe — try
                  again once you have a stable connection.
                </div>
              )}

              {lecture.ai && (
                <div className="ai-box">
                  <h4>AI Summary &amp; Quiz</h4>
                  <div className="summary">{lecture.ai}</div>
                </div>
              )}
            </article>
          ))
        )}
      </section>

      <footer className="foot">
        LectureSafe — built for students who study through load shedding.
      </footer>
    </div>
  );
}
