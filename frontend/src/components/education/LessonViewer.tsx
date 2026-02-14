import React, { useEffect } from "react";
import { Topic, Category, ContentSection, Difficulty } from "./types";
import { isTopicComplete, markTopicComplete, setLastVisited, saveQuizScore } from "./progressUtils";
import QuizSection from "./QuizSection";
import { ArrowLeft, Clock, Check, ChevronLeft, ChevronRight } from "lucide-react";

interface LessonViewerProps {
  topic: Topic;
  category: Category;
  onBack: () => void;
  onNavigate: (topicId: string) => void;
  onProgressUpdate: () => void;
}

const diffBadge: Record<Difficulty, { label: string; cls: string }> = {
  beginner: { label: "Beginner", cls: "bg-gain/10 text-gain" },
  intermediate: { label: "Intermediate", cls: "bg-warn/10 text-warn" },
  advanced: { label: "Advanced", cls: "bg-loss/10 text-loss" },
};

function renderSection(section: ContentSection, idx: number) {
  switch (section.type) {
    case "heading":
      return (
        <h3 key={idx} className="text-xl font-bold text-gray-100 mt-8 mb-3">
          {section.content}
        </h3>
      );
    case "text":
      return (
        <p key={idx} className="text-gray-300 leading-relaxed mb-4">
          {section.content}
        </p>
      );
    case "callout": {
      const variants: Record<string, { icon: string; bg: string; border: string; title: string }> = {
        tip: { icon: "💡", bg: "bg-brand-400/10", border: "border-brand-400/20", title: "Pro Tip" },
        warning: { icon: "⚠️", bg: "bg-warn/10", border: "border-warn/20", title: "Important" },
        "key-concept": { icon: "🔑", bg: "bg-purple-500/10", border: "border-purple-500/20", title: "Key Concept" },
        example: { icon: "📋", bg: "bg-gain/10", border: "border-gain/20", title: "Example" },
      };
      const v = variants[section.variant || "tip"] || variants.tip;
      return (
        <div key={idx} className={`${v.bg} border ${v.border} rounded-lg p-4 my-4`}>
          <p className="font-semibold text-sm mb-1">
            {v.icon} {v.title}
          </p>
          <p className="text-sm text-gray-300">{section.content}</p>
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
        <ul key={idx} className="list-disc list-inside space-y-2 my-4 text-gray-300">
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
          className="flex items-center text-sm text-gray-500 hover:text-brand-400 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to {category.name}
        </button>

        <div className="bg-surface-dark-secondary rounded-xl border border-white/10 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-100 mb-2">{topic.title}</h1>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badge.cls}`}>
                  {badge.label}
                </span>
                <span className="flex items-center text-sm text-gray-400">
                  <Clock className="w-4 h-4 mr-1" />
                  {topic.readTime} min read
                </span>
                {completed && (
                  <span className="flex items-center text-sm text-gain font-medium">
                    <Check className="w-4 h-4 mr-1" />
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
      <div className="bg-surface-dark-secondary rounded-xl border border-white/10 p-8 mb-6">
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
            className="w-full py-3 bg-gain text-surface-dark rounded-xl font-semibold hover:bg-gain/90 transition-colors flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Mark as Complete
          </button>
        )}

        <div className="flex justify-between">
          {prevTopic ? (
            <button
              onClick={() => onNavigate(prevTopic.id)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-400 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              {prevTopic.title}
            </button>
          ) : (
            <div />
          )}
          {nextTopic ? (
            <button
              onClick={() => onNavigate(nextTopic.id)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-400 transition-colors"
            >
              {nextTopic.title}
              <ChevronRight className="w-4 h-4" />
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
