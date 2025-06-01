import { v4 as uuidv4 } from 'uuid';
import type { ParagraphData, SentenceData, AnalysisData } from '../../src/types/admin.d.ts';

// Ensure types are compatible or define them if not present/matching in admin.d.ts
// For this implementation, we assume they are compatible:
// export interface SentenceData {
//   id: string;
//   text: string;
//   summary: string;
//   purposeKey: string; // Should be string, e.g., "NONE"
//   ties: string;
// }
//
// export interface ParagraphData {
//   id: string;
//   sentences: SentenceData[];
// }
//
// export type AnalysisData = ParagraphData[];

export function parsePassage(text: string): AnalysisData {
  if (!text.trim()) {
    return [];
  }

  const paragraphs = text.split(/\n\s*\n+/); // Split by one or more empty lines
  const analysisData: AnalysisData = [];

  paragraphs.forEach((paraText) => { // Removed paraIndex as it's not used
    if (!paraText.trim()) return; // Skip empty paragraphs after split

    const paragraphId = `p-${uuidv4()}`;
    // Basic sentence splitting: split by '.', '!', '?' followed by space or end of string.
    // This is a naive approach and might need refinement for edge cases (e.g., Mr. Jones, i.e.).
    // The regex tries to keep the terminator punctuation with the sentence.
    const sentenceTexts = paraText.trim().match(/[^.!?]+(?:[.!?](?=\s|$)|[.!?]$)?/g) || [];

    const sentences: SentenceData[] = [];
    sentenceTexts.forEach((sentenceText) => { // Removed sentIndex as it's not used
      const trimmedText = sentenceText.trim();
      if (trimmedText) {
        sentences.push({
          id: `s-${uuidv4()}`,
          text: trimmedText,
          summary: "",
          purposeKey: "NONE", // Default purpose
          ties: "",
        });
      }
    });

    if (sentences.length > 0) {
      analysisData.push({
        id: paragraphId,
        sentences: sentences,
      });
    }
  });

  return analysisData;
}
