import { marketBasics } from "./marketBasics";
import { technicalAnalysis } from "./technicalAnalysis";
import { popularIndicators } from "./popularIndicators";
import { investmentStrategies } from "./investmentStrategies";
import { fundamentalAnalysis } from "./fundamentalAnalysis";
import { riskManagement } from "./riskManagement";
import { glossaryTerms } from "./glossary";
import { Category, GlossaryTerm } from "../types";

export const categories: Category[] = [
  marketBasics,
  technicalAnalysis,
  popularIndicators,
  investmentStrategies,
  fundamentalAnalysis,
  riskManagement,
];

export const glossary: GlossaryTerm[] = glossaryTerms;

export {
  marketBasics,
  technicalAnalysis,
  popularIndicators,
  investmentStrategies,
  fundamentalAnalysis,
  riskManagement,
  glossaryTerms,
};
