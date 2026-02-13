import { EducationProgress } from "./types";

const STORAGE_KEY = "investracker_education_progress";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Helper to get auth token
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    // Token is stored directly as "token" in localStorage
    const token = localStorage.getItem("token");
    console.log("Checking token in localStorage:", token ? "✅ found" : "❌ not found");
    return token;
  } catch (e) {
    console.error("Error getting auth token:", e);
  }
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
  if (!token) {
    console.log("No auth token, skipping server sync");
    return;
  }

  try {
    console.log("Syncing progress to server:", progress);
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

    if (response.ok) {
      console.log("Progress synced successfully");
    } else {
      console.error("Failed to sync progress:", response.status, await response.text());
    }
  } catch (error) {
    console.error("Failed to sync progress to server:", error);
  }
}

export function saveProgress(progress: EducationProgress): void {
  console.log("💾 saveProgress called");
  saveLocalProgress(progress);
  console.log("💾 Local progress saved, now syncing to server...");
  syncProgressToServer(progress); // Sync to backend (fire and forget)
  console.log("💾 syncProgressToServer initiated");
}

export function markTopicComplete(topicId: string): EducationProgress {
  console.log("📚 markTopicComplete called for:", topicId);
  const progress = getLocalProgress();
  if (!progress.completed.includes(topicId)) {
    progress.completed.push(topicId);
  }
  console.log("📚 Calling saveProgress with:", progress);
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
