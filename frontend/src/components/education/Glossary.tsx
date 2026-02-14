import React, { useState, useMemo } from "react";
import { GlossaryTerm } from "./types";
import { ArrowLeft, Search } from "lucide-react";

interface GlossaryProps {
  terms: GlossaryTerm[];
  onBack: () => void;
}

const Glossary: React.FC<GlossaryProps> = ({ terms, onBack }) => {
  const [search, setSearch] = useState("");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = terms;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q)
      );
    }
    if (activeLetter) {
      result = result.filter((t) => t.term[0].toUpperCase() === activeLetter);
    }
    return result.sort((a, b) => a.term.localeCompare(b.term));
  }, [terms, search, activeLetter]);

  const letters = useMemo(() => {
    const s = new Set(terms.map((t) => t.term[0].toUpperCase()));
    return Array.from(s).sort();
  }, [terms]);

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center text-sm text-gray-500 hover:text-brand-400 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Education
      </button>

      <div className="bg-surface-dark-secondary rounded-xl border border-white/10 p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-100 mb-1 flex items-center gap-2">
          📖 Financial Glossary
        </h2>
        <p className="text-gray-500 text-sm mb-4">{terms.length} terms and definitions</p>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search terms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-dark border border-white/10 text-gray-100 focus:border-brand-400/40 focus:ring-2 focus:ring-brand-400/20 outline-none text-sm"
          />
        </div>

        {/* Letter Filter */}
        <div className="flex flex-wrap gap-1 mb-4">
          <button
            onClick={() => setActiveLetter(null)}
            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
              !activeLetter ? "bg-brand-400 text-surface-dark" : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            All
          </button>
          {letters.map((l) => (
            <button
              key={l}
              onClick={() => setActiveLetter(l === activeLetter ? null : l)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                l === activeLetter ? "bg-brand-400 text-surface-dark" : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Terms */}
      <div className="space-y-2">
        {filtered.map((term, idx) => (
          <div
            key={idx}
            className="bg-surface-dark-secondary rounded-xl p-4 border border-white/10 hover:border-brand-400/20 transition-colors"
          >
            <h4 className="font-semibold text-gray-100">{term.term}</h4>
            <p className="text-sm text-gray-400 mt-1">{term.definition}</p>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No matching terms found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Glossary;
