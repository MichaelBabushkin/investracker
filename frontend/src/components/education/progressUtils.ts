import { EducationProgress } from "./types";

const STORAGE_KEY = "investracker_education_progress";

export function getProgress(): EducationProgress {
  if (typeof window === "undefined") {
    return { completed: [], lastVisited: null, quizScores: {} };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { completed: [], lastVisited: null, quizScores: {} };
}

export function saveProgress(progress: EducationProgress): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function markTopicComplete(topicId: string): EducationProgress {
  const progress = getProgress();
  if (!progress.completed.includes(topicId)) {
    progress.completed.push(topicId);
  }
  saveProgress(progress);
  return progress;
}

export function setLastVisited(topicId: string): void {
  const progress = getProgress();
  progress.lastVisited = topicId;
  saveProgress(progress);
}

export function saveQuizScore(topicId: string, score: number): EducationProgress {
  const progress = getProgress();
  progress.quizScores[topicId] = score;
  saveProgress(progress);
  return progress;
}

export function isTopicComplete(topicId: string): boolean {
  return getProgress().completed.includes(topicId);
}

export function getCategoryProgress(topicIds: string[]): number {
  const completed = getProgress().completed;
  const count = topicIds.filter((id) => completed.includes(id)).length;
  return topicIds.length > 0 ? Math.round((count / topicIds.length) * 100) : 0;
}
