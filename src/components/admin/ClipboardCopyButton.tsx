import React, { useState } from "react";

interface ClipboardCopyButtonProps {
  textToCopy: string;
}

const ClipboardCopyButton: React.FC<ClipboardCopyButtonProps> = ({
  textToCopy,
}) => {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle"
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error("Failed to copy text: ", err);
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("idle"), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="clipboard-copy-button"
      data-copy-state={copyStatus}
    >
      {copyStatus === "idle" && "Copy"}
      {copyStatus === "copied" && "Copied!"}
      {copyStatus === "error" && "Error"}
    </button>
  );
};

export default ClipboardCopyButton;
