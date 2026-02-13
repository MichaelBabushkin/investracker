import React, { useState } from "react";
import { QuizQuestion } from "./types";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

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
      <div className="mt-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-8 border border-indigo-100 text-center">
        <div className="text-5xl mb-4">{pct >= 70 ? "🎉" : pct >= 40 ? "👍" : "📚"}</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Quiz Complete!</h3>
        <p className="text-lg text-gray-700">
          You scored{" "}
          <span className="font-bold text-indigo-600">
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
    <div className="mt-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          🧠 Quick Quiz
        </h3>
        <span className="text-sm text-gray-500">
          {currentQ + 1} / {questions.length}
        </span>
      </div>

      <p className="text-gray-800 font-medium mb-4">{question.question}</p>

      <div className="space-y-2 mb-4">
        {question.options.map((option, idx) => {
          let style = "border-gray-200 bg-white hover:border-indigo-300";
          if (revealed) {
            if (idx === question.correctIndex) {
              style = "border-green-400 bg-green-50";
            } else if (idx === selected) {
              style = "border-red-400 bg-red-50";
            } else {
              style = "border-gray-200 bg-gray-50 opacity-60";
            }
          } else if (idx === selected) {
            style = "border-indigo-400 bg-indigo-50";
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${style} flex items-center gap-3`}
            >
              <span className="flex-shrink-0 w-7 h-7 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="text-sm text-gray-800">{option}</span>
              {revealed && idx === question.correctIndex && (
                <CheckCircleIcon className="w-5 h-5 text-green-500 ml-auto flex-shrink-0" />
              )}
              {revealed && idx === selected && idx !== question.correctIndex && (
                <XCircleIcon className="w-5 h-5 text-red-500 ml-auto flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className="bg-white rounded-lg p-3 mb-4 border border-indigo-100">
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-indigo-600">💡 Explanation: </span>
            {question.explanation}
          </p>
        </div>
      )}

      <div className="flex justify-end">
        {!revealed ? (
          <button
            onClick={handleCheck}
            disabled={selected === null}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Check Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            {currentQ < questions.length - 1 ? "Next Question →" : "Finish Quiz"}
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizSection;
