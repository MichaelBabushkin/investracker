import React from "react";

interface ErrorDisplayProps {
  error: string;
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  if (!error) return null;

  // Split by newlines for multiple validation errors
  const errorLines = error.split("\n").filter((line) => line.trim());

  return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
      {errorLines.length === 1 ? (
        <span>{error}</span>
      ) : (
        <ul className="list-disc list-inside space-y-1">
          {errorLines.map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
