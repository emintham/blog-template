// src/components/admin/ReconstructedPassage.tsx
// (Adjust path as needed in your Astro project)
import React, { useState } from "react";
import { RHETORICAL_PURPOSES } from "../constants";
import type { AnalysisData } from "../../types/admin.d.ts";

interface ReconstructedPassageProps {
  analysisData: AnalysisData;
}

const ReconstructedPassage: React.FC<ReconstructedPassageProps> = ({
  analysisData,
}) => {
  const [hoveredPurposeKey, setHoveredPurposeKey] = useState<string | null>(
    null
  );

  const handleSentenceMouseEnter = (purposeKey: string) => {
    setHoveredPurposeKey(purposeKey);
  };

  const handleSentenceMouseLeave = () => {
    setHoveredPurposeKey(null);
  };

  return (
    <div id="reconstructed-passage-content" className="passage-content">
      {analysisData.map((paragraph) => {
        const hasText = paragraph.sentences.some(
          (s) => s.text && s.text.trim() !== ""
        );
        if (!hasText) return null;

        return (
          <p key={paragraph.id} className="reconstructed-paragraph">
            {paragraph.sentences.map((sentence, index) => {
              if (sentence.text && sentence.text.trim() !== "") {
                const purpose =
                  RHETORICAL_PURPOSES[sentence.purposeKey] ||
                  RHETORICAL_PURPOSES.NONE;
                const isLastTextSentenceInParagraph = !paragraph.sentences
                  .slice(index + 1)
                  .some((s) => s.text && s.text.trim() !== "");

                // Define base style
                const style: React.CSSProperties = {
                  backgroundColor: purpose.color,
                  transition: "font-size 0.2s ease-in-out, fontWeight 0.2s ease-in-out, boxShadow 0.2s ease-in-out",
                };

                // Apply highlighting if this sentence's purposeKey is being hovered
                if (
                  hoveredPurposeKey &&
                  sentence.purposeKey === hoveredPurposeKey
                ) {
                  style.fontSize = "1.1em";
                  style.fontWeight = "bold";
                  style.boxShadow = "0 0 5px rgba(0,0,0,0.3)";
                } else {
                  // Ensure defaults for non-hovered sentences or when no hover is active
                  style.fontSize = "1em";
                  style.fontWeight = "normal";
                  style.boxShadow = "none";
                }

                return (
                  <React.Fragment key={sentence.id}>
                    <span
                      className="sentence-highlight"
                      style={style}
                      onMouseEnter={() =>
                        handleSentenceMouseEnter(sentence.purposeKey)
                      }
                      onMouseLeave={handleSentenceMouseLeave}
                      title={purpose.name} // Display purpose name as a tooltip
                    >
                      {sentence.text}
                    </span>
                    {!isLastTextSentenceInParagraph && " "}
                  </React.Fragment>
                );
              }
              return null;
            })}
          </p>
        );
      })}
    </div>
  );
};

export default ReconstructedPassage;
