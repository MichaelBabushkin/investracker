import { EducationProgress } from "./types";

const STORAGE_KEY = "investracker_education_progress";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

let lastSyncTimestamp = 0;
const SYNC_COOLDOWN = 2000; // Don't sync more than once per 2 seconds

// Helper to get auth token
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
}

// Get progress from localStorage (fallback/cache)
function getLocalProgress(): EducationProgress {
  if (typeof window === "undefined") {
    return { completed: [], lastVisited: null, quizScores: {} };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { completed: [], lastVisited: null, quizScores: {} };
}

// Save progress to localStorage (cache)
function saveLocalProgress(progress: EducationProgress): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

// Fetch progress from API
export async function fetchProgress(): Promise<EducationProgress> {
  const token = getAuthToken();
  if (!token) return getLocalProgress();

  try {
    const response = await fetch(`${API_BASE_URL}/education/progress`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const data = await response.json();
      const progress: EducationProgress = {
        completed: data.completed_topics || [],
        lastVisited: data.last_visited_topic || null,
        quizScores: data.quiz_scores || {},
      };
      saveLocalProgress(progress);
      return progress;
    }
  } catch {
    // Fall back to local cache on API failure
  }

  return getLocalProgress();
}

// Sync progress - get from localStorage immediately
export function getProgress(): EducationProgress {
  return getLocalProgress();
}

// Update progress on server
async function syncProgressToServer(progress: EducationProgress): Promise<void> {
  const now = Date.now();
  if (now - lastSyncTimestamp < SYNC_COOLDOWN) return;

  const token = getAuthToken();
  if (!token) return;

  try {
    lastSyncTimestamp = now;
    const response = await fetch(`${API_BASE_URL}/education/progress`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        completed_topics: progress.completed,
        last_visited_topic: progress.lastVisited,
        quiz_scores: progress.quizScores,
      }),
    });

    if (!response.ok) {
      lastSyncTimestamp = 0; // Allow retry
    }
  } catch {
    lastSyncTimestamp = 0; // Allow retry
  }
}

export async function saveProgress(progress: EducationProgress): Promise<void> {
  saveLocalProgress(progress);
  await syncProgressToServer(progress);
}

export function markTopicComplete(topicId: string): void {
  const progress = getLocalProgress();
  if (!progress.completed.includes(topicId)) {
    progress.completed.push(topicId);
  }
  saveProgress(progress);
}

export function setLastVisited(topicId: string): void {
  const progress = getLocalProgress();
  progress.lastVisited = topicId;
  saveLocalProgress(progress);
}

export function saveQuizScore(topicId: string, score: number): void {
  const progress = getLocalProgress();
  progress.quizScores[topicId] = score;
  saveProgress(progress);
}

export function isTopicComplete(topicId: string): boolean {
  return getLocalProgress().completed.includes(topicId);
}

export function getCategoryProgress(topicIds: string[]): number {
  const completed = getLocalProgress().completed;
  const count = topicIds.filter((id) => completed.includes(id)).length;
  return topicIds.length > 0 ? Math.round((count / topicIds.length) * 100) : 0;
}
