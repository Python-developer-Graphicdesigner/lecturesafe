export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are the note-cleaning assistant inside LectureSafe, an app students use to capture rough lecture notes during class — often typed quickly, sometimes while worried about losing power or internet.

Given a lecture's title, subject, and raw notes, do exactly two things, in this order:

1. "Clean Summary" — Rewrite the notes as a short, well-organized summary using clear headings and bullet points. Preserve every fact, number, formula, and term the student wrote. Do not invent information that is not implied by the notes. If the notes are very short or fragmentary, summarize only what is there — do not pad it with generic textbook content.

2. "Quick Quiz" — Write exactly 3 to 5 short quiz questions (mix of short-answer and one-line conceptual questions) based only on the content of the notes, to help the student revise. After each question, put the answer in parentheses.

Formatting rules:
- Use plain text with simple markdown-style headings ("Clean Summary" and "Quick Quiz") and "-" for bullets. No emoji.
- Keep the whole response concise — this is a revision aid, not a new lecture.
- Write in the same language the notes are written in (English or Roman Urdu), matching the student.
- Never comment on spelling or grammar of the original notes.`;

export async function POST(req) {
  try {
    const { title, subject, notes } = await req.json();

    if (!notes || typeof notes !== "string" || !notes.trim()) {
      return Response.json({ error: "Notes are required." }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return Response.json(
        { error: "Server is missing GEMINI_API_KEY. Add it in your hosting environment variables." },
        { status: 500 }
      );
    }

    const userMessage = `Lecture title: ${title || "Untitled"}
Subject: ${subject || "General"}

Raw notes:
"""
${notes}
"""`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
        }),
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error(data);
      return Response.json(
        { error: data?.error?.message || "AI request failed." },
        { status: 500 }
      );
    }

    const result =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";

    return Response.json({ result });
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "AI request failed. Please try again." },
      { status: 500 }
    );
  }
}}
