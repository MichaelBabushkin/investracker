import React from "react";
import { Category, Difficulty } from "./types";
import { isTopicComplete, getCategoryProgress } from "./progressUtils";
import ProgressBar from "./ProgressBar";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";

interface TopicListProps {
  category: Category;
  onBack: () => void;
  onSelectTopic: (topicId: string) => void;
}

const difficultyConfig: Record<Difficulty, { label: string; color: string; bg: string }> = {
  beginner: { label: "Beginner", color: "text-green-700", bg: "bg-green-100" },
  intermediate: { label: "Intermediate", color: "text-yellow-700", bg: "bg-yellow-100" },
  advanced: { label: "Advanced", color: "text-red-700", bg: "bg-red-100" },
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
          className="flex items-center text-sm text-gray-500 hover:text-indigo-600 transition-colors mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Categories
        </button>
        <div className="flex items-center gap-4 mb-4">
          <div
            className={`w-16 h-16 rounded-xl bg-gradient-to-br ${category.gradient} flex items-center justify-center text-3xl shadow-md`}
          >
            {category.emoji}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{category.name}</h2>
            <p className="text-gray-500">{category.description}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>
              {topicIds.filter((id) => isTopicComplete(id)).length} of{" "}
              {category.topics.length} topics completed
            </span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <ProgressBar percentage={progress} color="bg-indigo-500" height="h-3" />
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
                  ? "bg-green-50 border-green-200 hover:border-green-300"
                  : "bg-white border-gray-100 hover:border-indigo-200 hover:shadow-md"
              }`}
            >
              {/* Number / Check */}
              <div className="flex-shrink-0">
                {completed ? (
                  <CheckCircleSolid className="w-8 h-8 text-green-500" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center text-sm font-bold text-gray-400 group-hover:text-indigo-600 transition-colors">
                    {index + 1}
                  </div>
                )}
              </div>

              {/* Title & Meta */}
              <div className="flex-1 min-w-0">
                <h3
                  className={`font-semibold truncate ${
                    completed ? "text-green-800" : "text-gray-900 group-hover:text-indigo-600"
                  } transition-colors`}
                >
                  {topic.title}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${diff.bg} ${diff.color}`}>
                    {diff.label}
                  </span>
                  <span className="flex items-center text-xs text-gray-400">
                    <ClockIcon className="w-3 h-3 mr-1" />
                    {topic.readTime} min
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex-shrink-0">
                <PlayIcon className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 transition-colors" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TopicList;
