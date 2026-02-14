import React, { useEffect } from "react";
import { Topic, Category, ContentSection, Difficulty } from "./types";
import { isTopicComplete, markTopicComplete, setLastVisited, saveQuizScore } from "./progressUtils";
import QuizSection from "./QuizSection";
import {
  ArrowLeftIcon,
  ClockIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

interface LessonViewerProps {
  topic: Topic;
  category: Category;
  onBack: () => void;
  onNavigate: (topicId: string) => void;
  onProgressUpdate: () => void;
}

const diffBadge: Record<Difficulty, { label: string; cls: string }> = {
  beginner: { label: "Beginner", cls: "bg-green-100 text-green-700" },
  intermediate: { label: "Intermediate", cls: "bg-yellow-100 text-yellow-700" },
  advanced: { label: "Advanced", cls: "bg-red-100 text-red-700" },
};

function renderSection(section: ContentSection, idx: number) {
  switch (section.type) {
    case "heading":
      return (
        <h3 key={idx} className="text-xl font-bold text-gray-900 mt-8 mb-3">
          {section.content}
        </h3>
      );
    case "text":
      return (
        <p key={idx} className="text-gray-700 leading-relaxed mb-4">
          {section.content}
        </p>
      );
    case "callout": {
      const variants: Record<string, { icon: string; bg: string; border: string; title: string }> = {
        tip: { icon: "💡", bg: "bg-blue-50", border: "border-blue-200", title: "Pro Tip" },
        warning: { icon: "⚠️", bg: "bg-amber-50", border: "border-amber-200", title: "Important" },
        "key-concept": { icon: "🔑", bg: "bg-indigo-50", border: "border-indigo-200", title: "Key Concept" },
        example: { icon: "📋", bg: "bg-green-50", border: "border-green-200", title: "Example" },
      };
      const v = variants[section.variant || "tip"] || variants.tip;
      return (
        <div key={idx} className={`${v.bg} border ${v.border} rounded-lg p-4 my-4`}>
          <p className="font-semibold text-sm mb-1">
            {v.icon} {v.title}
          </p>
          <p className="text-sm text-gray-700">{section.content}</p>
        </div>
      );
    }
    case "formula":
      return (
        <div key={idx} className="bg-gray-900 text-green-400 rounded-lg p-4 my-4 font-mono text-sm overflow-x-auto">
          {section.content}
        </div>
      );
    case "list":
      return (
        <ul key={idx} className="list-disc list-inside space-y-2 my-4 text-gray-700">
          {(section.items || []).map((item, i) => (
            <li key={i} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}

const LessonViewer: React.FC<LessonViewerProps> = ({
  topic,
  category,
  onBack,
  onNavigate,
  onProgressUpdate,
}) => {
  const completed = isTopicComplete(topic.id);
  const topicIndex = category.topics.findIndex((t) => t.id === topic.id);
  const prevTopic = topicIndex > 0 ? category.topics[topicIndex - 1] : null;
  const nextTopic = topicIndex < category.topics.length - 1 ? category.topics[topicIndex + 1] : null;
  const badge = diffBadge[topic.difficulty];

  useEffect(() => {
    setLastVisited(topic.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [topic.id]);

  const handleMarkComplete = () => {
    markTopicComplete(topic.id);
    onProgressUpdate();
  };

  const handleQuizComplete = (score: number) => {
    saveQuizScore(topic.id, score);
    markTopicComplete(topic.id);
    onProgressUpdate();
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-sm text-gray-500 hover:text-indigo-600 transition-colors mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to {category.name}
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{topic.title}</h1>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badge.cls}`}>
                  {badge.label}
                </span>
                <span className="flex items-center text-sm text-gray-400">
                  <ClockIcon className="w-4 h-4 mr-1" />
                  {topic.readTime} min read
                </span>
                {completed && (
                  <span className="flex items-center text-sm text-green-600 font-medium">
                    <CheckIcon className="w-4 h-4 mr-1" />
                    Completed
                  </span>
                )}
              </div>
            </div>
            <span className="text-3xl">{category.emoji}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-6">
        {topic.content.map((section, idx) => renderSection(section, idx))}
      </div>

      {/* Quiz */}
      {topic.quiz.length > 0 && (
        <QuizSection questions={topic.quiz} onComplete={handleQuizComplete} />
      )}

      {/* Navigation & Complete */}
      <div className="mt-8 space-y-4">
        {!completed && (
          <button
            onClick={handleMarkComplete}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <CheckIcon className="w-5 h-5" />
            Mark as Complete
          </button>
        )}

        <div className="flex justify-between">
          {prevTopic ? (
            <button
              onClick={() => onNavigate(prevTopic.id)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              {prevTopic.title}
            </button>
          ) : (
            <div />
          )}
          {nextTopic ? (
            <button
              onClick={() => onNavigate(nextTopic.id)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
            >
              {nextTopic.title}
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
};

export default LessonViewer;
