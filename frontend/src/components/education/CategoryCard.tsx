import React from "react";
import { Category } from "./types";
import ProgressBar from "./ProgressBar";
import { getCategoryProgress } from "./progressUtils";

interface CategoryCardProps {
  category: Category;
  onClick: (categoryId: string) => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, onClick }) => {
  const topicIds = category.topics.map((t) => t.id);
  const progress = getCategoryProgress(topicIds);
  const completedCount = category.topics.filter((t) =>
    typeof window !== "undefined" &&
    JSON.parse(localStorage.getItem("investracker_education_progress") || '{"completed":[]}').completed.includes(t.id)
  ).length;

  return (
    <button
      onClick={() => onClick(category.id)}
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 text-left group border border-gray-100 hover:border-indigo-200 hover:-translate-y-1"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-14 h-14 rounded-xl bg-gradient-to-br ${category.gradient} flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform duration-300`}
        >
          {category.emoji}
        </div>
        {progress === 100 && (
          <span className="text-green-500 text-xl">✅</span>
        )}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
        {category.name}
      </h3>
      <p className="text-sm text-gray-500 mb-4 line-clamp-2">
        {category.description}
      </p>
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-400">
          <span>{category.topics.length} topics</span>
          <span>
            {completedCount}/{category.topics.length} done
          </span>
        </div>
        <ProgressBar percentage={progress} />
      </div>
    </button>
  );
};

export default CategoryCard;
