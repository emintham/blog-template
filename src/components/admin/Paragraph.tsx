// src/components/admin/Paragraph.tsx
import React from "react";
import Sentence from "./Sentence";
import type { ParagraphData, SentenceData } from "../../types/admin";
import { PlusCircle } from "lucide-react";

interface ParagraphProps {
  paragraph: ParagraphData;
  index: number;
  onUpdateSentence: (
    paragraphId: string,
    sentenceId: string,
    updatedSentence: SentenceData
  ) => void;
  onRemoveSentence: (paragraphId: string, sentenceId: string) => void;
  onAddSentenceHere: (paragraphId: string) => void;
  hoveredPurposeKey: string | null;
  onSentenceMouseEnter: (purposeKey: string) => void;
  onSentenceMouseLeave: () => void;
}

const Paragraph: React.FC<ParagraphProps> = (props) => {
  const {
    paragraph,
    index,
    onUpdateSentence,
    onRemoveSentence,
    onAddSentenceHere,
    hoveredPurposeKey,
    onSentenceMouseEnter,
    onSentenceMouseLeave,
  } = props;

  return (
    <div className="paragraph-group" data-paragraph-id={paragraph.id}>
      <div className="paragraph-group-header">
        <h3 className="paragraph-group-title">Paragraph {index + 1}</h3>
      </div>
      <div className="sentences-container">
        {paragraph.sentences.map((s, sIndex) => (
          <React.Fragment key={s.id}>
            {sIndex > 0 && <hr className="sentence-divider" />}
            <Sentence
              sentence={s}
              paragraphId={paragraph.id}
              onUpdateSentence={onUpdateSentence}
              onRemoveSentence={onRemoveSentence}
              hoveredPurposeKey={hoveredPurposeKey}
              onSentenceMouseEnter={onSentenceMouseEnter}
              onSentenceMouseLeave={onSentenceMouseLeave}
            />
          </React.Fragment>
        ))}
        {paragraph.sentences.length === 0 && (
          <div style={{ padding: "10px", color: "#777", textAlign: "center" }}>
            This paragraph is empty. Click "Add Sentence" below to begin.
          </div>
        )}
      </div>
      <div
        className="add-sentence-to-paragraph-container"
        style={{ textAlign: "center", paddingTop: "10px" }}
      >
        <button
          type="button"
          className="control-button control-button-small"
          onClick={() => onAddSentenceHere(paragraph.id)}
          title="Add sentence to this paragraph"
        >
          <PlusCircle size={16} />
          Add Sentence
        </button>
      </div>
    </div>
  );
};

export default Paragraph;
