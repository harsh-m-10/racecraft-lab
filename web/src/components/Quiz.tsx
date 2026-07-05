"use client";

import { useState } from "react";
import type { QuizQuestion } from "@/lib/quiz";

export function Quiz({
  title,
  questions,
  shareUrl,
}: {
  title: string;
  questions: QuizQuestion[];
  shareUrl: string;
}) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  if (questions.length === 0) return null;
  const q = questions[i];

  const pick = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    if (opt === q.answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (i + 1 >= questions.length) {
      setDone(true);
    } else {
      setI(i + 1);
      setPicked(null);
    }
  };

  const share = async () => {
    const text = `I scored ${score}/${questions.length} on the ${title} quiz 🏁 ${shareUrl}`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user cancelled */
    }
  };

  const verdict =
    score === questions.length
      ? "Team principal material."
      : score >= questions.length * 0.7
        ? "Paddock regular."
        : score >= questions.length * 0.4
          ? "Casual viewer — no shame in it."
          : "Did you watch the highlights at 2x?";

  return (
    <section className="card flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="kicker">Race quiz</p>
          <h2 className="mt-1 text-xl font-bold">How closely were you watching?</h2>
        </div>
        {!done ? (
          <span className="num text-sm text-mute">
            {i + 1}/{questions.length}
          </span>
        ) : null}
      </div>

      {done ? (
        <div className="flex flex-col items-start gap-3">
          <p className="num text-4xl font-black">
            {score}
            <span className="text-xl text-mute">/{questions.length}</span>
          </p>
          <p className="text-ink-2">{verdict}</p>
          <button
            type="button"
            onClick={share}
            className="rounded-md bg-accent px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            {copied ? "Copied!" : "Share your score"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="font-medium">{q.q}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {q.options.map((opt) => {
              const isAnswer = picked && opt === q.answer;
              const isWrongPick = picked === opt && opt !== q.answer;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => pick(opt)}
                  className={`card px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    isAnswer
                      ? "border-live/70 bg-live/10"
                      : isWrongPick
                        ? "border-accent/70 bg-accent/10"
                        : picked
                          ? "opacity-50"
                          : "hover:border-accent/50"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {picked ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-ink-2">
                {picked === q.answer ? "Correct." : `It was ${q.answer}.`}{" "}
                {q.explain ?? ""}
              </p>
              <button
                type="button"
                onClick={next}
                className="shrink-0 rounded-md bg-card-2 px-4 py-2 text-sm font-bold hover:text-accent"
              >
                {i + 1 >= questions.length ? "Score →" : "Next →"}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
