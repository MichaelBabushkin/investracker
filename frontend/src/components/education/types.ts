export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ContentSection {
  type: "text" | "callout" | "formula" | "list" | "heading";
  content: string;
  items?: string[];
  variant?: "tip" | "warning" | "key-concept" | "example";
}

export interface Topic {
  id: string;
  title: string;
  difficulty: Difficulty;
  readTime: number;
  content: ContentSection[];
  quiz: QuizQuestion[];
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  description: string;
  gradient: string;
  topics: Topic[];
}

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface EducationProgress {
  completed: string[];
  lastVisited: string | null;
  quizScores: Record<string, number>;
}
