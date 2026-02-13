"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  AcademicCapIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  ArrowPathIcon,
  SparklesIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import { categories, glossary } from "./data";
import { Category, Topic } from "./types";
import {
  getProgress,
  setLastVisited,
  isTopicComplete,
  fetchProgress,
} from "./progressUtils";
import CategoryCard from "./CategoryCard";
import TopicList from "./TopicList";
import LessonViewer from "./LessonViewer";
import Glossary from "./Glossary";

type View = "home" | "category" | "lesson" | "glossary";

export default function EducationCenter() {
  const [view, setView] = useState<View>("home");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [progress, setProgress] = useState(getProgress());
  const [loading, setLoading] = useState(true);

  // Fetch progress from API on mount
  useEffect(() => {
    fetchProgress().then((apiProgress) => {
      setProgress(apiProgress);
      setLoading(false);
    });

    // Listen for progress updates
    const handleProgressUpdate = () => {
      fetchProgress().then(setProgress);
    };
    window.addEventListener("education-progress-updated", handleProgressUpdate);
    return () => window.removeEventListener("education-progress-updated", handleProgressUpdate);
  }, []);

  // Refresh progress on view changes
  useEffect(() => {
    setProgress(getProgress());
  }, [view]);

  const refreshProgress = () => setProgress(getProgress());

  // Resume last visited
  const lastVisited = progress.lastVisited;
  const continueCategory = lastVisited
    ? categories.find((c) => c.topics.some((t) => t.id === lastVisited))
    : null;
  const continueTopic = continueCategory
    ? continueCategory.topics.find((t) => t.id === lastVisited)
    : null;

  // Global search across topics
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results: { category: Category; topic: Topic }[] = [];
    for (const cat of categories) {
      for (const topic of cat.topics) {
        if (
          topic.title.toLowerCase().includes(q) ||
          topic.content.some(
            (s) =>
              s.content.toLowerCase().includes(q) ||
              (s.items && s.items.some((i) => i.toLowerCase().includes(q)))
          )
        ) {
          results.push({ category: cat, topic });
        }
      }
    }
    return results;
  }, [searchQuery]);

  // Overall progress stats
  const totalTopics = categories.reduce((sum, c) => sum + c.topics.length, 0);
  const completedCount = progress.completed.length;
  const overallPercent = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;

  const handleSelectCategory = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (cat) {
      setSelectedCategory(cat);
      setView("category");
      setSearchQuery("");
    }
  };

  const handleSelectTopicById = (topicId: string) => {
    if (!selectedCategory) return;
    const topic = selectedCategory.topics.find((t) => t.id === topicId);
    if (topic) {
      setSelectedTopic(topic);
      setLastVisited(topic.id);
      setView("lesson");
      refreshProgress();
    }
  };

  const handleSelectTopicDirect = (cat: Category, topic: Topic) => {
    setSelectedCategory(cat);
    setSelectedTopic(topic);
    setLastVisited(topic.id);
    setView("lesson");
    refreshProgress();
  };

  const handleBack = () => {
    if (view === "lesson") {
      setView("category");
      setSelectedTopic(null);
    } else if (view === "category" || view === "glossary") {
      setView("home");
      setSelectedCategory(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                <AcademicCapIcon className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Education Center
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Master the markets, one lesson at a time
                </p>
              </div>
            </div>

            {/* Search bar */}
            {view === "home" && (
              <div className="relative w-full sm:w-80">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search topics, indicators, strategies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* HOME VIEW */}
        {view === "home" && !searchQuery && (
          <div className="space-y-8">
            {/* Progress overview */}
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <TrophyIcon className="h-5 w-5" />
                    Your Learning Journey
                  </h2>
                  <p className="text-sm opacity-90 mt-1">
                    {completedCount} of {totalTopics} topics completed
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-48 bg-white/20 rounded-full h-3">
                    <div
                      className="bg-white rounded-full h-3 transition-all duration-700 ease-out"
                      style={{ width: `${overallPercent}%` }}
                    />
                  </div>
                  <span className="text-lg font-bold">{overallPercent}%</span>
                </div>
              </div>

              {/* Continue learning */}
              {continueTopic && continueCategory && (
                <button
                  onClick={() => handleSelectTopicDirect(continueCategory, continueTopic)}
                  className="mt-4 flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  Continue: {continueTopic.title}
                </button>
              )}
            </div>

            {/* Category grid */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BookOpenIcon className="h-5 w-5 text-indigo-500" />
                Learning Paths
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {categories.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    onClick={handleSelectCategory}
                  />
                ))}
              </div>
            </div>

            {/* Glossary link */}
            <button
              onClick={() => setView("glossary")}
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 flex items-center justify-between hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="text-3xl">📖</div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Financial Glossary
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {glossary.length}+ terms and definitions from A to Z
                  </p>
                </div>
              </div>
              <SparklesIcon className="h-5 w-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
            </button>

            {/* Fun fact */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                💡 Did you know?
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                {funFacts[Math.floor(Math.random() * funFacts.length)]}
              </p>
            </div>
          </div>
        )}

        {/* SEARCH RESULTS */}
        {view === "home" && searchQuery && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Search Results
              </h2>
              <button
                onClick={() => setSearchQuery("")}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Clear search
              </button>
            </div>
            {searchResults.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  No topics found for &ldquo;{searchQuery}&rdquo;
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map(({ category, topic }) => (
                  <button
                    key={topic.id}
                    onClick={() => handleSelectTopicDirect(category, topic)}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between hover:border-indigo-300 dark:hover:border-indigo-600 transition-all text-left"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {topic.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {category.emoji} {category.name} &middot; {topic.readTime} min read
                      </p>
                    </div>
                    {isTopicComplete(topic.id) && (
                      <span className="text-green-500 text-lg">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CATEGORY (TOPIC LIST) VIEW */}
        {view === "category" && selectedCategory && (
          <TopicList
            category={selectedCategory}
            onSelectTopic={handleSelectTopicById}
            onBack={handleBack}
          />
        )}

        {/* LESSON VIEW */}
        {view === "lesson" && selectedTopic && selectedCategory && (
          <LessonViewer
            topic={selectedTopic}
            category={selectedCategory}
            onBack={handleBack}
            onNavigate={handleSelectTopicById}
            onProgressUpdate={refreshProgress}
          />
        )}

        {/* GLOSSARY VIEW */}
        {view === "glossary" && (
          <Glossary terms={glossary} onBack={handleBack} />
        )}
      </div>
    </div>
  );
}

const funFacts = [
  "The S&P 500 has returned an average of ~10% per year since its inception in 1957.",
  "Albert Einstein reportedly called compound interest 'the eighth wonder of the world.'",
  "The longest bull market in history lasted 11 years (2009-2020) with the S&P 500 gaining over 400%.",
  "Warren Buffett made 99% of his wealth after his 50th birthday, showing the power of compounding.",
  "The term 'bull' and 'bear' markets come from the way these animals attack — bulls thrust horns up, bears swipe paws down.",
  "The first stock exchange was established in Amsterdam in 1602 by the Dutch East India Company.",
  "During the 1929 crash, the Dow lost 89% of its value and took 25 years to recover to pre-crash levels.",
  "Over 90% of actively managed funds underperform their benchmark index over a 15-year period.",
  "The most expensive stock in the world is Berkshire Hathaway Class A, trading at over $600,000 per share.",
  "The 'January Effect' suggests stocks tend to rise more in January than other months, especially small-caps.",
];
