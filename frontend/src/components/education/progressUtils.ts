import { EducationProgress } from "./types";

const STORAGE_KEY = "investracker_education_progress";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

let lastSyncTimestamp = 0;
const SYNC_COOLDOWN = 2000; // Don't sync more than once per 2 seconds

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
  
  // Don't fetch from API in background on every call - this causes race conditions
  // Only fetch on initial mount (handled by EducationCenter)
  
  return local;
}

// Update progress on server
async function syncProgressToServer(progress: EducationProgress): Promise<void> {
  const now = Date.now();
  if (now - lastSyncTimestamp < SYNC_COOLDOWN) {
    console.log("🕐 Skipping sync - too soon since last sync");
    return;
  }
  
  const token = getAuthToken();
  if (!token) {
    console.log("No auth token, skipping server sync");
    return;
  }

  try {
    lastSyncTimestamp = now;
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
      console.log("✅ Progress synced successfully");
    } else {
      const errorText = await response.text();
      console.error("❌ Failed to sync progress:", response.status, errorText);
      lastSyncTimestamp = 0; // Allow retry
    }
  } catch (error) {
    console.error("❌ Failed to sync progress to server:", error);
    lastSyncTimestamp = 0; // Allow retry
  }
}

export async function saveProgress(progress: EducationProgress): Promise<void> {
  console.log("💾 saveProgress called");
  saveLocalProgress(progress);
  console.log("💾 Local progress saved, now syncing to server...");
  
  // Actually await the sync to ensure it completes
  await syncProgressToServer(progress);
  console.log("💾 Server sync completed");
}

export function markTopicComplete(topicId: string): void {
  console.log("📚 markTopicComplete called for:", topicId);
  const progress = getLocalProgress();
  if (!progress.completed.includes(topicId)) {
    progress.completed.push(topicId);
  }
  console.log("📚 Calling saveProgress with:", progress);
  // Don't await here - let it sync in background
  saveProgress(progress);
}

export function setLastVisited(topicId: string): void {
  const progress = getLocalProgress();
  progress.lastVisited = topicId;
  // Don't sync just for last visited - too many calls
  saveLocalProgress(progress);
}

export function saveQuizScore(topicId: string, score: number): void {
  const progress = getLocalProgress();
  progress.quizScores[topicId] = score;
  console.log("📝 Calling saveProgress with quiz score:", progress);
  // Don't await here - let it sync in background
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
