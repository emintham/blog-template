// src/components/admin/PassageAnalysisInterface.tsx
import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { parsePassage } from '../../utils/passageParser';
import type { AnalysisData, ParagraphData, SentenceData } from '../../types/admin.d.ts';
import Paragraph from './Paragraph'; // Assuming this component will be created
import { RHETORICAL_PURPOSES } from '../constants'; // Needed for passing down or for context

const PassageAnalysisInterface: React.FC = () => {
  const [rawText, setRawText] = useState<string>('');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hoveredPurposeKey, setHoveredPurposeKey] = useState<string | null>(null);

  const handleRawTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRawText(event.target.value);
  };

  const handleAnalyzeClick = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      try {
        const parsedData = parsePassage(rawText);
        setAnalysisData(parsedData);
      } catch (error) {
        console.error("Error parsing passage:", error);
        setAnalysisData(null);
      } finally {
        setIsLoading(false);
      }
    }, 50);
  }, [rawText]);

  const handleUpdateSentence = useCallback((paragraphId: string, sentenceId: string, updatedSentence: SentenceData) => {
    setAnalysisData(prevData =>
      prevData?.map(p =>
        p.id === paragraphId
          ? {
              ...p,
              sentences: p.sentences.map(s =>
                s.id === sentenceId ? updatedSentence : s
              ),
            }
          : p
      ) || null
    );
  }, []);

  const handleRemoveSentence = useCallback((paragraphId: string, sentenceId: string) => {
    setAnalysisData(prevData =>
      prevData?.map(p =>
        p.id === paragraphId
          ? { ...p, sentences: p.sentences.filter(s => s.id !== sentenceId) }
          : p
      )
      // Optional: .filter(p => p.sentences.length > 0) // To remove paragraphs if they become empty
      || null
    );
  }, []);

  const handleAddSentenceToParagraph = useCallback((paragraphId: string) => {
    setAnalysisData(prevData =>
      prevData?.map(p =>
        p.id === paragraphId
          ? {
              ...p,
              sentences: [
                ...p.sentences,
                {
                  id: `s-${uuidv4()}`,
                  text: "", // New sentences start empty
                  summary: "",
                  purposeKey: "NONE", // Default purpose
                  ties: "",
                },
              ],
            }
          : p
      ) || null
    );
  }, []);

  const handleSentenceMouseEnter = useCallback((purposeKey: string) => {
    setHoveredPurposeKey(purposeKey);
  }, []);

  const handleSentenceMouseLeave = useCallback(() => {
    setHoveredPurposeKey(null);
  }, []);

  return (
    <div className="passage-analysis-interface" style={{marginTop: '20px'}}>
      <textarea
        value={rawText}
        onChange={handleRawTextChange}
        placeholder="Paste your passage here. Separate paragraphs with a blank line."
        rows={10}
        className="passage-input-textarea" // Replaced inline styles with class
        disabled={isLoading}
      />
      <button
        onClick={handleAnalyzeClick}
        disabled={isLoading || !rawText.trim()}
        className="analyze-passage-button" // Replaced inline styles with class
      >
        {isLoading ? 'Analyzing...' : 'Analyze Passage'}
      </button>

      {isLoading && <p>Loading analysis...</p>}

      {!isLoading && analysisData && analysisData.length > 0 && (
        <div id="parsed-content-container">
          {analysisData.map((paragraph, index) => (
            <Paragraph
              key={paragraph.id}
              paragraph={paragraph}
              index={index} // Pass index if Paragraph component uses it
              onUpdateSentence={handleUpdateSentence}
              onRemoveSentence={handleRemoveSentence}
              onAddSentenceHere={handleAddSentenceToParagraph}
              hoveredPurposeKey={hoveredPurposeKey}
              onSentenceMouseEnter={handleSentenceMouseEnter}
              onSentenceMouseLeave={handleSentenceMouseLeave}
            />
          ))}
        </div>
      )}
      {!isLoading && analysisData && analysisData.length === 0 && rawText.trim() !== "" && (
        <p>No parsable content found. Ensure your text has meaningful sentences and paragraphs are separated by a blank line.</p>
      )}
      {!isLoading && (!analysisData || (analysisData.length === 0 && rawText.trim() === "")) && (
        <p>Paste text above and click "Analyze Passage" to see results.</p>
      )}
    </div>
  );
};

export default PassageAnalysisInterface;
```
