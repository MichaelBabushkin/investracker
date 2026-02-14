import React from "react";
import { Category, Difficulty } from "./types";
import { isTopicComplete, getCategoryProgress } from "./progressUtils";
import ProgressBar from "./ProgressBar";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Play,
} from "lucide-react";

interface TopicListProps {
  category: Category;
  onBack: () => void;
  onSelectTopic: (topicId: string) => void;
}

const difficultyConfig: Record<Difficulty, { label: string; color: string; bg: string }> = {
  beginner: { label: "Beginner", color: "text-gain", bg: "bg-gain/10" },
  intermediate: { label: "Intermediate", color: "text-warn", bg: "bg-warn/10" },
  advanced: { label: "Advanced", color: "text-loss", bg: "bg-loss/10" },
};

const TopicList: React.FC<TopicListProps> = ({ category, onBack, onSelectTopic }) => {
  const topicIds = category.topics.map((t) => t.id);
  const progress = getCategoryProgress(topicIds);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center text-sm text-gray-500 hover:text-brand-400 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Categories
        </button>
        <div className="flex items-center gap-4 mb-4">
          <div
            className={`w-16 h-16 rounded-xl bg-gradient-to-br ${category.gradient} flex items-center justify-center text-3xl`}
          >
            {category.emoji}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-100">{category.name}</h2>
            <p className="text-gray-500">{category.description}</p>
          </div>
        </div>
        <div className="bg-surface-dark-secondary rounded-xl p-4 border border-white/10">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>
              {topicIds.filter((id) => isTopicComplete(id)).length} of{" "}
              {category.topics.length} topics completed
            </span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <ProgressBar percentage={progress} color="bg-brand-400" height="h-3" />
        </div>
      </div>

      {/* Topics */}
      <div className="space-y-3">
        {category.topics.map((topic, index) => {
          const completed = isTopicComplete(topic.id);
          const diff = difficultyConfig[topic.difficulty];

          return (
            <button
              key={topic.id}
              onClick={() => onSelectTopic(topic.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left group ${
                completed
                  ? "bg-gain/10 border-gain/20 hover:border-gain/30"
                  : "bg-surface-dark-secondary border-white/10 hover:border-brand-400/20"
              }`}
            >
              {/* Number / Check */}
              <div className="flex-shrink-0">
                {completed ? (
                  <CheckCircle className="w-8 h-8 text-gain" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-brand-400/10 flex items-center justify-center text-sm font-bold text-gray-400 group-hover:text-brand-400 transition-colors">
                    {index + 1}
                  </div>
                )}
              </div>

              {/* Title & Meta */}
              <div className="flex-1 min-w-0">
                <h3
                  className={`font-semibold truncate ${
                    completed ? "text-gain" : "text-gray-100 group-hover:text-brand-400"
                  } transition-colors`}
                >
                  {topic.title}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${diff.bg} ${diff.color}`}>
                    {diff.label}
                  </span>
                  <span className="flex items-center text-xs text-gray-400">
                    <Clock className="w-3 h-3 mr-1" />
                    {topic.readTime} min
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex-shrink-0">
                <Play className="w-5 h-5 text-gray-500 group-hover:text-brand-400 transition-colors" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TopicList;
