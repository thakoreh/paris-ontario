"use client";

import { useState, useEffect } from "react";
import { Sparkles, Trophy, ChevronRight, RotateCcw } from "lucide-react";

const TRIVIA_QUESTIONS = [
  {
    q: "What gives the cobblestones on Paris's main street their distinctive golden color?",
    options: [
      "A special paint applied in the 1920s",
      "Iron oxide in the sandstone from the Gananoque quarries",
      "Reflected light from the Grand River",
      "The unique limestone found only in this region",
    ],
    correct: 1,
    explanation:
      "The cobblestones contain high levels of limonite and siderite (iron oxide), giving them their honey-gold hue. They were originally quarried for the Welland Canal in the 1840s.",
  },
  {
    q: "The Grand River that flows through Paris, Ontario flows in which direction?",
    options: ["North to South", "South to North", "East to West", "West to East"],
    correct: 0,
    explanation:
      "The Grand River flows north to south, originating near Dundalk and emptying into Lake Erie at Port Maitland. It's one of Ontario's most significant waterways.",
  },
  {
    q: "What unusual thing makes the town's name 'Paris' particularly ironic?",
    options: [
      "It's located in the middle of Amish country",
      "There is no actual 'Paris' connection to the French city",
      "The nearest French speaker is 200km away",
      "There's a famous Paris in Texas that people confuse it with",
    ],
    correct: 1,
    explanation:
      "Paris, Ontario was named after Paris, France, but the connection is purely aspirational — the founder hoped it would become a cultural centre like its European namesake. It never developed any French heritage.",
  },
  {
    q: "How many covered bridges exist in Ontario today?",
    options: ["Fewer than 5", "About 10", "About 50", "More than 100"],
    correct: 1,
    explanation:
      "Ontario has fewer than 10 surviving covered bridges. The covered bridge near Paris on County Road 18 is one of the rarest surviving examples of this 19th-century engineering.",
  },
  {
    q: "What is the name of the lake that gives Paris, Ontario its unofficial motto?",
    options: ["Lake Paris", "Blue Lake", "Pine Lake", "Spruce Lake"],
    correct: 1,
    explanation:
      "Blue Lake (and the adjacent Blue Lake Road) is one of Paris's most recognizable features. The lake — actually a kettle lake from the last ice age — is famous for its unusual blue color, caused by the calcium carbonate content.",
  },
  {
    q: "The Paris Cobblestone Festival celebrates the town's unique street surfaces. In what month does it occur?",
    options: ["June", "August", "September", "October"],
    correct: 2,
    explanation:
      "The Cobblestone Festival is held annually in September. It features live music, historical walking tours, artisan markets, and a celebration of the town's unique cobblestone heritage.",
  },
  {
    q: "Which famous Canadian director filmed parts of his debut movie in Paris, Ontario?",
    options: [
      "Denis Villeneuve",
      "Atom Egoyan",
      "Sarah Polley",
      "David Cronenberg",
    ],
    correct: 2,
    explanation:
      "Sarah Polley's debut film 'The Adventures of Priscilla, Queen of the Desert' was actually shot in various Ontario locations. More importantly, Atom Egoyan grew up in the Paris area.",
  },
];

export function ParisTrivia() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [askedToday, setAskedToday] = useState(false);

  // Check if already played today (session only, no persistence needed)
  useEffect(() => {
    const played = sessionStorage.getItem("paris-trivia-played");
    if (played) setAskedToday(true);
  }, []);

  const todayQ = TRIVIA_QUESTIONS[currentQ % TRIVIA_QUESTIONS.length];

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === todayQ.correct) setScore((s) => s + 1);
    if (currentQ === TRIVIA_QUESTIONS.length - 1) setDone(true);
  };

  const nextQuestion = () => {
    if (currentQ < TRIVIA_QUESTIONS.length - 1) {
      setCurrentQ((q) => q + 1);
      setSelected(null);
    }
  };

  const restart = () => {
    setCurrentQ(0);
    setSelected(null);
    setScore(0);
    setDone(false);
  };

  if (askedToday && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-5 py-3 rounded-full shadow-xl text-white font-semibold text-sm"
        style={{ background: "var(--burgundy)" }}
      >
        <Sparkles size={18} />
        Paris Trivia — Play Again
      </button>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-5 py-3 rounded-full shadow-xl text-white font-semibold text-sm animate-bounce-gentle"
        style={{ background: "linear-gradient(135deg, var(--burgundy), var(--warm-brown))" }}
      >
        <Sparkles size={18} />
        Test Your Paris Knowledge!
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 md:w-96">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border" style={{ borderColor: "var(--gold)" }}>
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, var(--burgundy), var(--warm-brown))" }}
        >
          <div className="flex items-center gap-2 text-white">
            <Trophy size={18} />
            <span className="font-display font-bold">Paris Trivia</span>
            <span className="text-xs text-white/70">
              {currentQ + 1}/{TRIVIA_QUESTIONS.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {done && (
              <span className="text-white text-sm font-semibold">
                {score}/{TRIVIA_QUESTIONS.length}
              </span>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-5">
          {!done ? (
            <>
              <p className="font-display font-bold mb-4 text-gray-800 text-base leading-snug">
                {todayQ.q}
              </p>
              <div className="space-y-2">
                {todayQ.options.map((opt, idx) => {
                  const isSelected = selected === idx;
                  const isCorrect = idx === todayQ.correct;
                  const showResult = selected !== null;

                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(idx)}
                      disabled={selected !== null}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        showResult
                          ? isCorrect
                            ? "bg-[var(--success)]/20 text-green-800 border border-[var(--success)]"
                            : isSelected
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-gray-50 text-gray-400"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-transparent"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {selected !== null && (
                <div
                  className="mt-4 p-4 rounded-xl text-sm"
                  style={{ background: "var(--warm-bg)" }}
                >
                  <p className="font-semibold mb-1">
                    {selected === todayQ.correct ? "✅ Correct!" : "💡 Here's why:"}
                  </p>
                  <p className="text-gray-600 leading-relaxed">{todayQ.explanation}</p>
                  {currentQ < TRIVIA_QUESTIONS.length - 1 && (
                    <button
                      onClick={nextQuestion}
                      className="mt-3 flex items-center gap-1 text-sm font-semibold"
                      style={{ color: "var(--burgundy)" }}
                    >
                      Next question <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-center py-4">
                <div
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                  style={{ background: score >= 5 ? "var(--success)" : "var(--gold)" }}
                >
                  <Trophy size={36} color="white" />
                </div>
                <p className="text-2xl font-display font-bold mb-2">
                  {score}/{TRIVIA_QUESTIONS.length}
                </p>
                <p className="text-gray-600 text-sm mb-6">
                  {score === TRIVIA_QUESTIONS.length
                    ? "🏆 Perfect! You're a true Paris expert!"
                    : score >= 5
                    ? "🌟 Impressive! You really know your Paris."
                    : score >= 3
                    ? "👍 Not bad! Keep exploring."
                    : "🤔 Time to explore more of Paris!"}
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={restart}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white"
                    style={{ background: "var(--burgundy)" }}
                  >
                    <RotateCcw size={14} /> Play Again
                  </button>
                  <button
                    onClick={() => {
                      sessionStorage.setItem("paris-trivia-played", "true");
                      setAskedToday(true);
                      setIsOpen(false);
                    }}
                    className="px-4 py-2 rounded-full text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
