// src/components/admin/CloseReadingAnalyzer.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import Paragraph from "./Paragraph";
import ReconstructedPassage from "./ReconstructedPassage";
import { MAX_WAIT_ATTEMPTS, WAIT_INTERVAL_MS, delay } from "../constants";
import type {
  AnalysisData,
  SentenceData,
  ParagraphData,
  UuidV4Function,
} from "../../types/admin";
import { Download, Upload, PlusSquare } from "lucide-react";

declare global {
  interface Window {
    uuid?: {
      v4?: UuidV4Function;
    };
  }
}

const CloseReadingAnalyzer: React.FC = () => {
  const [analysisData, setAnalysisData] = useState<AnalysisData>([]);
  const [uuidv4Func, setUuidv4Func] = useState<UuidV4Function | null>(null);
  const [isUuidLoading, setIsUuidLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadUuid = async () => {
      let attempts = 0;
      while (
        (typeof window.uuid === "undefined" ||
          typeof window.uuid.v4 === "undefined") &&
        attempts < MAX_WAIT_ATTEMPTS
      ) {
        await delay(WAIT_INTERVAL_MS);
        attempts++;
      }

      if (
        typeof window.uuid !== "undefined" &&
        typeof window.uuid.v4 === "function"
      ) {
        setUuidv4Func(() => window.uuid!.v4!);
      } else {
        console.error(
          "UUID library (window.uuid) failed to load after waiting."
        );
        setError(
          "A critical library (uuid) could not be loaded. Functionality will be limited."
        );
      }
      setIsUuidLoading(false);
    };
    loadUuid();
  }, []);

  useEffect(() => {
    if (uuidv4Func && analysisData.length === 0) {
      const newParagraphId = uuidv4Func();
      const newSentence = {
        id: uuidv4Func(),
        text: "",
        summary: "",
        purposeKey: "NONE",
        ties: "",
      };
      setAnalysisData([{ id: newParagraphId, sentences: [newSentence] }]);
    }
  }, [uuidv4Func, analysisData.length]);

  const handleAddSentenceToSpecificParagraph = useCallback(
    (paragraphId: string) => {
      if (!uuidv4Func) return;
      const newSentence = {
        id: uuidv4Func(),
        text: "",
        summary: "",
        purposeKey: "NONE",
        ties: "",
      };
      setAnalysisData((prevData) =>
        prevData.map((p) =>
          p.id === paragraphId
            ? { ...p, sentences: [...p.sentences, newSentence] }
            : p
        )
      );
      setTimeout(
        () =>
          document.getElementById(`sentence-text-${newSentence.id}`)?.focus(),
        0
      );
    },
    [uuidv4Func]
  );

  const handleAddParagraphAfter = useCallback(
    (currentParagraphId: string) => {
      if (!uuidv4Func) return;
      const newParagraph: ParagraphData = {
        id: uuidv4Func(),
        sentences: [
          {
            id: uuidv4Func(),
            text: "",
            summary: "",
            purposeKey: "NONE",
            ties: "",
          },
        ],
      };
      setAnalysisData((prevData) => {
        const currentIndex = prevData.findIndex(
          (p) => p.id === currentParagraphId
        );
        if (currentIndex === -1) return prevData; // Should not happen
        const newData = [...prevData];
        newData.splice(currentIndex + 1, 0, newParagraph);
        return newData;
      });
      // Consider focusing the new paragraph's first sentence textarea
    },
    [uuidv4Func]
  );

  const handleUpdateSentence = useCallback(
    (
      paragraphId: string,
      sentenceId: string,
      updatedSentenceData: SentenceData
    ) => {
      setAnalysisData((prevData) =>
        prevData.map((p) =>
          p.id === paragraphId
            ? {
                ...p,
                sentences: p.sentences.map((s) =>
                  s.id === sentenceId ? updatedSentenceData : s
                ),
              }
            : p
        )
      );
    },
    []
  );

  const handleRemoveSentence = useCallback(
    (paragraphId: string, sentenceId: string) => {
      setAnalysisData((prevData) => {
        if (!uuidv4Func) return prevData;

        let newData = prevData.map((p) => {
          if (p.id === paragraphId) {
            return {
              ...p,
              sentences: p.sentences.filter((s) => s.id !== sentenceId),
            };
          }
          return p;
        });

        // If a paragraph becomes empty, remove it, unless it's the only paragraph
        const originalLength = newData.length;
        newData = newData.filter((p) => {
          if (p.sentences.length === 0) {
            // Only remove if it's not the last remaining paragraph
            return originalLength <= 1;
          }
          return true;
        });

        // If all paragraphs were removed, or if the last remaining paragraph is now empty,
        // create a new default paragraph.
        if (
          newData.length === 0 ||
          (newData.length === 1 && newData[0].sentences.length === 0)
        ) {
          const newPid = uuidv4Func();
          const newSid = uuidv4Func();
          return [
            {
              id: newPid,
              sentences: [
                {
                  id: newSid,
                  text: "",
                  summary: "",
                  purposeKey: "NONE",
                  ties: "",
                },
              ],
            },
          ];
        }
        return newData;
      });
    },
    [uuidv4Func]
  );

  const handleExportJson = () => {
    const filename = `close-reading-analysis-${new Date().toISOString().slice(0, 10)}.json`;
    const jsonStr = JSON.stringify(analysisData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleImportJsonFileSelected = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!uuidv4Func) return;
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedResult = e.target?.result;
          if (typeof importedResult !== "string") {
            alert("Error reading file content.");
            return;
          }
          const imported = JSON.parse(importedResult) as Partial<ParagraphData>[];

          if (Array.isArray(imported)) {
            const validatedData: AnalysisData = imported.map((p: Partial<ParagraphData>) => ({
              id: p.id || uuidv4Func(),
              sentences:
                Array.isArray(p.sentences) && p.sentences.length > 0
                  ? p.sentences.map((s: Partial<SentenceData>) => ({
                      id: s.id || uuidv4Func(),
                      text: typeof s.text === "string" ? s.text : "",
                      summary: typeof s.summary === "string" ? s.summary : "",
                      purposeKey:
                        typeof s.purposeKey === "string"
                          ? s.purposeKey
                          : "NONE",
                      ties: typeof s.ties === "string" ? s.ties : "",
                    }))
                  : [
                      {
                        id: uuidv4Func(),
                        text: "",
                        summary: "",
                        purposeKey: "NONE",
                        ties: "",
                      },
                    ], // Ensure at least one sentence
            }));
            // Ensure at least one paragraph exists after import, even if imported data is empty array
            if (validatedData.length === 0) {
              const newPid = uuidv4Func();
              const newSid = uuidv4Func();
              setAnalysisData([
                {
                  id: newPid,
                  sentences: [
                    {
                      id: newSid,
                      text: "",
                      summary: "",
                      purposeKey: "NONE",
                      ties: "",
                    },
                  ],
                },
              ]);
            } else {
              setAnalysisData(validatedData);
            }
          } else {
            alert(
              "Invalid JSON file format: Data should be an array of paragraphs."
            );
          }
        } catch (error) {
          alert("Error parsing JSON file: " + (error as Error).message);
        }
      };
      reader.readAsText(file);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  if (isUuidLoading) return <div>Loading libraries...</div>;
  if (error)
    return (
      <div style={{ color: "red", padding: "20px", border: "1px solid red" }}>
        Error: {error}
      </div>
    );

  return (
    <div className="analyze-container">
      <aside id="left-column" className="left-column">
        <div className="reconstruction-area">
          <h2>Reconstructed Passage</h2>
          <ReconstructedPassage analysisData={analysisData} />
        </div>
        <div className="left-column-controls">
          <button
            type="button"
            id="export-json-btn"
            className="control-button"
            onClick={handleExportJson}
          >
            <Download size={16} />
            Export JSON
          </button>
          <button
            type="button"
            id="import-json-btn"
            className="control-button"
            onClick={triggerFileInput}
            disabled={!uuidv4Func}
          >
            <Upload size={16} />
            Import JSON
          </button>
          <input
            type="file"
            ref={fileInputRef}
            id="import-json-file-handler"
            accept=".json"
            style={{ display: "none" }}
            onChange={handleImportJsonFileSelected}
          />
        </div>
      </aside>
      <main id="right-column" className="right-column">
        <div id="analysis-forms-container">
          {analysisData.map((p, index) => (
            <React.Fragment key={p.id + "-group"}>
              <Paragraph
                paragraph={p}
                index={index}
                onUpdateSentence={handleUpdateSentence}
                onRemoveSentence={handleRemoveSentence}
                onAddSentenceHere={handleAddSentenceToSpecificParagraph}
              />
              <div className="add-paragraph-after-button-container">
                <button
                  type="button"
                  className="control-button control-button-subtle add-paragraph-after-btn"
                  onClick={() => handleAddParagraphAfter(p.id)}
                  disabled={!uuidv4Func}
                  title="Add a new paragraph after this one"
                >
                  <PlusSquare size={18} />
                  Add Paragraph Here
                </button>
              </div>
            </React.Fragment>
          ))}
          {analysisData.length === 0 && uuidv4Func && !isUuidLoading && (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <p>Your document is currently empty.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CloseReadingAnalyzer;
