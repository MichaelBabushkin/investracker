import React, { useState } from "react";
import { QuizQuestion } from "./types";
import { CheckCircle, XCircle } from "lucide-react";

interface QuizSectionProps {
  questions: QuizQuestion[];
  onComplete: (score: number) => void;
}

const QuizSection: React.FC<QuizSectionProps> = ({ questions, onComplete }) => {
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  if (questions.length === 0) return null;

  const question = questions[currentQ];

  const handleSelect = (index: number) => {
    if (revealed) return;
    setSelected(index);
  };

  const handleCheck = () => {
    if (selected === null) return;
    setRevealed(true);
    if (selected === question.correctIndex) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((q) => q + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      const finalScore = score + (selected === question.correctIndex ? 0 : 0);
      setFinished(true);
      onComplete(score);
    }
  };

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="mt-8 bg-brand-400/10 rounded-xl p-8 border border-brand-400/20 text-center">
        <div className="text-5xl mb-4">{pct >= 70 ? "🎉" : pct >= 40 ? "👍" : "📚"}</div>
        <h3 className="text-xl font-bold text-gray-100 mb-2">Quiz Complete!</h3>
        <p className="text-lg text-gray-300">
          You scored{" "}
          <span className="font-bold text-brand-400">
            {score}/{questions.length}
          </span>{" "}
          ({pct}%)
        </p>
        <p className="text-sm text-gray-500 mt-2">
          {pct >= 70
            ? "Excellent! You've mastered this topic."
            : pct >= 40
            ? "Good effort! Review the lesson and try again."
            : "Keep learning! Re-read the lesson and try again."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 bg-brand-400/10 rounded-xl p-6 border border-brand-400/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
          🧠 Quick Quiz
        </h3>
        <span className="text-sm text-gray-500">
          {currentQ + 1} / {questions.length}
        </span>
      </div>

      <p className="text-gray-200 font-medium mb-4">{question.question}</p>

      <div className="space-y-2 mb-4">
        {question.options.map((option, idx) => {
          let style = "border-white/10 bg-surface-dark-secondary hover:border-brand-400/30";
          if (revealed) {
            if (idx === question.correctIndex) {
              style = "border-gain/40 bg-gain/10";
            } else if (idx === selected) {
              style = "border-loss/40 bg-loss/10";
            } else {
              style = "border-white/10 bg-surface-dark opacity-60";
            }
          } else if (idx === selected) {
            style = "border-brand-400/40 bg-brand-400/10";
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className={`w-full text-left p-3 rounded-xl border-2 transition-all ${style} flex items-center gap-3`}
            >
              <span className="flex-shrink-0 w-7 h-7 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="text-sm text-gray-200">{option}</span>
              {revealed && idx === question.correctIndex && (
                <CheckCircle className="w-5 h-5 text-gain ml-auto flex-shrink-0" />
              )}
              {revealed && idx === selected && idx !== question.correctIndex && (
                <XCircle className="w-5 h-5 text-loss ml-auto flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className="bg-surface-dark-secondary rounded-xl p-3 mb-4 border border-white/10">
          <p className="text-sm text-gray-300">
            <span className="font-semibold text-brand-400">💡 Explanation: </span>
            {question.explanation}
          </p>
        </div>
      )}

      <div className="flex justify-end">
        {!revealed ? (
          <button
            onClick={handleCheck}
            disabled={selected === null}
            className="px-5 py-2 bg-brand-400 text-surface-dark rounded-xl font-medium hover:bg-brand-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Check Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-5 py-2 bg-brand-400 text-surface-dark rounded-xl font-medium hover:bg-brand-500 transition-colors"
          >
            {currentQ < questions.length - 1 ? "Next Question →" : "Finish Quiz"}
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizSection;
