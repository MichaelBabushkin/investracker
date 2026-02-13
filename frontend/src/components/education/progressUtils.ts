import { EducationProgress } from "./types";

const STORAGE_KEY = "investracker_education_progress";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Helper to get auth token
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const auth = localStorage.getItem("auth");
    if (auth) {
      const parsed = JSON.parse(auth);
      return parsed.token || null;
    }
  } catch {}
  return null;
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
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      const progress: EducationProgress = {
        completed: data.completed_topics || [],
        lastVisited: data.last_visited_topic || null,
        quizScores: data.quiz_scores || {},
      };
      saveLocalProgress(progress); // Cache it
      return progress;
    }
  } catch (error) {
    console.error("Failed to fetch progress from API, using local cache:", error);
  }

  return getLocalProgress();
}

// Sync progress - get from localStorage immediately, then fetch from API
export function getProgress(): EducationProgress {
  const local = getLocalProgress();
  
  // Fetch from API in background to stay in sync
  fetchProgress().then((apiProgress) => {
    if (JSON.stringify(apiProgress) !== JSON.stringify(local)) {
      // API has different data, trigger a re-render by dispatching event
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("education-progress-updated"));
      }
    }
  });

  return local;
}

// Update progress on server
async function syncProgressToServer(progress: EducationProgress): Promise<void> {
  const token = getAuthToken();
  if (!token) return;

  try {
    await fetch(`${API_BASE_URL}/education/progress`, {
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
  } catch (error) {
    console.error("Failed to sync progress to server:", error);
  }
}

export function saveProgress(progress: EducationProgress): void {
  saveLocalProgress(progress);
  syncProgressToServer(progress); // Sync to backend
}

export function markTopicComplete(topicId: string): EducationProgress {
  const progress = getLocalProgress();
  if (!progress.completed.includes(topicId)) {
    progress.completed.push(topicId);
  }
  saveProgress(progress);
  return progress;
}

export function setLastVisited(topicId: string): void {
  const progress = getLocalProgress();
  progress.lastVisited = topicId;
  saveProgress(progress);
}

export function saveQuizScore(topicId: string, score: number): EducationProgress {
  const progress = getLocalProgress();
  progress.quizScores[topicId] = score;
  saveProgress(progress);
  return progress;
}

export function isTopicComplete(topicId: string): boolean {
  return getLocalProgress().completed.includes(topicId);
}

export function getCategoryProgress(topicIds: string[]): number {
  const completed = getLocalProgress().completed;
  const count = topicIds.filter((id) => completed.includes(id)).length;
  return topicIds.length > 0 ? Math.round((count / topicIds.length) * 100) : 0;
}
