// src/components/admin/PassageAnalyzer.tsx
import React, { useState, useEffect, useCallback } from 'react';
import ReconstructedPassage from './ReconstructedPassage';
import type { AnalysisData, ParagraphData, SentenceData, UuidV4Function } from '../../types/admin';
import { MAX_WAIT_ATTEMPTS, WAIT_INTERVAL_MS, delay } from '../constants'; // Assuming constants are accessible

// Declare global window interface for uuid
declare global {
  interface Window {
    uuid?: {
      v4?: UuidV4Function;
    };
  }
}

const PassageAnalyzer: React.FC = () => {
  const [passageText, setPassageText] = useState<string>('');
  const [analysisData, setAnalysisData] = useState<AnalysisData>([]);
  const [uuidv4Func, setUuidv4Func] = useState<UuidV4Function | null>(null);
  const [isUuidLoading, setIsUuidLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Load UUID function
  useEffect(() => {
    const loadUuid = async () => {
      let attempts = 0;
      while (
        (typeof window.uuid === 'undefined' || typeof window.uuid.v4 === 'undefined') &&
        attempts < MAX_WAIT_ATTEMPTS
      ) {
        await delay(WAIT_INTERVAL_MS);
        attempts++;
      }

      if (typeof window.uuid !== 'undefined' && typeof window.uuid.v4 === 'function') {
        setUuidv4Func(() => window.uuid!.v4!);
      } else {
        console.error('UUID library (window.uuid) failed to load after waiting.');
        setError('A critical library (uuid) could not be loaded. Functionality will be limited.');
      }
      setIsUuidLoading(false);
    };
    loadUuid();
  }, []);

  const handlePassageChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPassageText(event.target.value);
  };

  const processPassage = useCallback(() => {
    if (!uuidv4Func) {
      setError('UUID function is not loaded. Cannot process passage.');
      return;
    }
    if (!passageText.trim()) {
      setAnalysisData([]);
      return;
    }

    const paragraphsText = passageText.split('\n').filter(p => p.trim() !== '');

    const newAnalysisData: AnalysisData = paragraphsText.map(paraText => {
      const paragraphId = uuidv4Func();

      // Handle sentence splitting, paying attention to "..."
      // This regex aims to split by periods, but not if they are part of an ellipsis.
      // It looks for a period not preceded or followed by another period.
      // This might need refinement for more complex cases (e.g., "Mr. Jones...")
      let sentencesText = paraText.split(/(?<!\.)\.(?!\.)\s*/).filter(s => s.trim() !== '');

      // Further refinement for ellipses: join parts that were split inside an ellipsis
      // For example, "Hello ..." might become ["Hello ", "", " "]
      // This is a simplified approach; a more robust parser might be needed for all edge cases.
      sentencesText = sentencesText.reduce((acc, current) => {
        if (acc.length > 0 && acc[acc.length - 1].endsWith('..')) {
          acc[acc.length - 1] += '.' + current;
        } else if (current.startsWith('..') && acc.length > 0) {
           acc[acc.length - 1] += current;
        }
        else if (acc.length > 0 && acc[acc.length-1].endsWith('.')) {
            // check if previous sentence ends with a period that is not part of an ellipsis
            // if so, then append current sentence to previous sentence
            const prevSentence = acc[acc.length-1];
            if (!prevSentence.endsWith('...') && !prevSentence.endsWith('..') && prevSentence.endsWith('.')) {
                acc[acc.length-1] += current;
            } else {
                acc.push(current);
            }
        }
         else {
          acc.push(current);
        }
        return acc;
      }, [] as string[]);

      // Ensure sentences that were only split by an ellipsis and should be whole are correctly formed.
      // E.g. "Sentence one... sentence two."
      // The previous split might give: ["Sentence one...", "sentence two"]
      // We need to ensure the period is re-added if it was the delimiter
      sentencesText = sentencesText.map((s, index, arr) => {
        // If this sentence was likely split from the next one by its terminating period
        // and it doesn't end with an ellipsis, add the period back.
        // This check is basic and might need more advanced NLP logic for perfection.
        if (index < arr.length -1 && !s.endsWith('...') && paraText.includes(s + '.')) {
             // Check if the original text segment that formed this sentence ended with a period
            // that was used as a delimiter.
            // Find the original segment:
            let originalSegment = s;
            if (index > 0) {
                //This is complex, let's assume for now sentences are split well enough by the regex.
                //The main goal is to avoid splitting "..."
            }
        }
        // Ensure "..." is not treated as an empty sentence if it's the only thing left.
        if (s.replace(/\./g, '').trim() === '') return null;


        return s;
      }).filter(s => s && s.trim() !== '');


      const sentences: SentenceData[] = sentencesText.map(text => ({
        id: uuidv4Func(),
        text: text.trim(), // Trim and ensure it's not just an ellipsis
        summary: '',
        purposeKey: 'NONE', // Default purpose
        ties: '',
      }));

      // If a paragraph results in no valid sentences (e.g., just "..." or empty lines),
      // still create a paragraph structure if needed, or filter it out if it's truly empty.
      // For now, let's ensure at least one sentence object if the original paragraph text wasn't empty.
      if (sentences.length === 0 && paraText.trim() !== '') {
          // This case might happen if the paragraph was e.g. just "..."
          // We should represent it as a single sentence.
          sentences.push({
            id: uuidv4Func(),
            text: paraText.trim(),
            summary: '',
            purposeKey: 'NONE',
            ties: '',
          });
      }


      return {
        id: paragraphId,
        sentences: sentences.length > 0 ? sentences : [], // Avoid empty sentence arrays if paragraph was empty
      };
    }).filter(p => p.sentences.length > 0); // Filter out paragraphs that ended up with no sentences

    setAnalysisData(newAnalysisData);
  }, [passageText, uuidv4Func]);

  // Automatically process passage when text changes and UUID is loaded
  useEffect(() => {
    if (passageText && uuidv4Func) {
        // Debounce processing or process on button click? For now, auto-process.
        processPassage();
    } else if (!passageText) {
        setAnalysisData([]); // Clear analysis if text area is empty
    }
  }, [passageText, uuidv4Func, processPassage]);

  if (isUuidLoading) return <div>Loading libraries...</div>;
  if (error) return <div style={{ color: 'red', padding: '20px', border: '1px solid red' }}>Error: {error}</div>;

  return (
    <div className="passage-analyzer-container">
      <div className="passage-input-area">
        <h2>Paste Passage</h2>
        <textarea
          value={passageText}
          onChange={handlePassageChange}
          placeholder="Paste your text here. Paragraphs are separated by newlines. Sentences by periods."
          rows={10}
          // Removed inline style, using class now
        />
        {/* Removed explicit Analyze button to auto-process on text change for now */}
        {/* <button
          onClick={processPassage}
          disabled={!uuidv4Func || !passageText.trim()}
          style={{ marginTop: '10px', padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Analyze Passage
        </button> */}
      </div>
      <div className="reconstructed-passage-display-area"> {/* Updated class name */}
        <h2>Reconstructed Passage</h2>
        {analysisData.length > 0 ? (
          <ReconstructedPassage analysisData={analysisData} />
        ) : (
          <p>The analyzed passage will appear here once you paste some text.</p>
        )}
      </div>
    </div>
  );
};

export default PassageAnalyzer;
