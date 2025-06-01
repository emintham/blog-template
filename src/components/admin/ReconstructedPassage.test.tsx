// src/components/admin/ReconstructedPassage.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom'; // For toHaveStyle, etc.

import ReconstructedPassage from './ReconstructedPassage';
import { RHETORICAL_PURPOSES as actualRhetoricalPurposes } from '../constants'; // Use actual constants
import type { AnalysisData } from '../../types/admin.d.ts';

// Use a subset of actual purposes for easier testing, or mock if necessary
// For this test, let's define a controlled set to ensure test stability
const RHETORICAL_PURPOSES = {
  NONE: { name: 'None', color: 'rgb(128, 128, 128)', isPlaceholder: true }, // grey
  ARGUMENT: { name: 'Argument', color: 'rgb(0, 0, 255)' }, // blue
  EVIDENCE: { name: 'Evidence', color: 'rgb(0, 128, 0)' }, // green
  CLAIM: { name: 'Claim', color: 'rgb(255, 0, 0)' }, // red
};

const mockAnalysisData: AnalysisData = [
  {
    id: 'p1',
    sentences: [
      { id: 's1', text: 'Sentence 1.1', purposeKey: 'ARGUMENT', summary: '', ties: '' },
      { id: 's2', text: 'Sentence 1.2', purposeKey: 'EVIDENCE', summary: '', ties: '' },
    ],
  },
  {
    id: 'p2',
    sentences: [
      { id: 's3', text: 'Sentence 2.1', purposeKey: 'ARGUMENT', summary: '', ties: '' },
      { id: 's4', text: 'Sentence 2.2', purposeKey: 'CLAIM', summary: '', ties: '' },
      { id: 's5', text: 'Sentence 2.3 with no purpose.', purposeKey: 'UNKNOWN_PURPOSE', summary: '', ties: ''} // Test NONE case
    ],
  },
  {
    id: 'p3', // Paragraph with no displayable sentences
    sentences: [
      { id: 's6', text: '', purposeKey: 'ARGUMENT', summary: '', ties: ''}
    ]
  }
];

describe('ReconstructedPassage Component', () => {
  // Test 1: Initial rendering and tooltips
  test('renders sentences with correct initial styles and tooltips', () => {
    render(<ReconstructedPassage analysisData={mockAnalysisData} />);

    // Sentence 1.1
    const sentence1_1 = screen.getByText('Sentence 1.1');
    expect(sentence1_1).toBeInTheDocument();
    expect(sentence1_1).toHaveAttribute('title', RHETORICAL_PURPOSES.ARGUMENT.name);
    expect(sentence1_1).toHaveStyle(`backgroundColor: ${RHETORICAL_PURPOSES.ARGUMENT.color}`);
    expect(sentence1_1).toHaveStyle('fontSize: 1em');
    expect(sentence1_1).toHaveStyle('fontWeight: normal');
    expect(sentence1_1).toHaveStyle('boxShadow: none');

    // Sentence 1.2
    const sentence1_2 = screen.getByText('Sentence 1.2');
    expect(sentence1_2).toBeInTheDocument();
    expect(sentence1_2).toHaveAttribute('title', RHETORICAL_PURPOSES.EVIDENCE.name);
    expect(sentence1_2).toHaveStyle(`backgroundColor: ${RHETORICAL_PURPOSES.EVIDENCE.color}`);

    // Sentence 2.1
    const sentence2_1 = screen.getByText('Sentence 2.1');
    expect(sentence2_1).toBeInTheDocument();
    expect(sentence2_1).toHaveAttribute('title', RHETORICAL_PURPOSES.ARGUMENT.name);
    expect(sentence2_1).toHaveStyle(`backgroundColor: ${RHETORICAL_PURPOSES.ARGUMENT.color}`);

    // Sentence 2.2
    const sentence2_2 = screen.getByText('Sentence 2.2');
    expect(sentence2_2).toBeInTheDocument();
    expect(sentence2_2).toHaveAttribute('title', RHETORICAL_PURPOSES.CLAIM.name);
    expect(sentence2_2).toHaveStyle(`backgroundColor: ${RHETORICAL_PURPOSES.CLAIM.color}`);

    // Sentence 2.3 (UNKNOWN_PURPOSE should fall back to NONE)
    const sentence2_3 = screen.getByText('Sentence 2.3 with no purpose.');
    expect(sentence2_3).toBeInTheDocument();
    expect(sentence2_3).toHaveAttribute('title', RHETORICAL_PURPOSES.NONE.name);
    expect(sentence2_3).toHaveStyle(`backgroundColor: ${RHETORICAL_PURPOSES.NONE.color}`);

    // Check that sentence s6 from p3 is not rendered because its text is empty
    expect(screen.queryByText('')).not.toBeInTheDocument();
  });

  // Test 2: Highlighting on mouse enter
  test('highlights all sentences with the same purposeKey on mouse enter', () => {
    render(<ReconstructedPassage analysisData={mockAnalysisData} />);

    const sentence1_1 = screen.getByText('Sentence 1.1'); // ARGUMENT
    const sentence1_2 = screen.getByText('Sentence 1.2'); // EVIDENCE
    const sentence2_1 = screen.getByText('Sentence 2.1'); // ARGUMENT
    const sentence2_2 = screen.getByText('Sentence 2.2'); // CLAIM

    fireEvent.mouseEnter(sentence1_1);

    // Sentences with purposeKey "ARGUMENT" should be highlighted
    expect(sentence1_1).toHaveStyle('fontSize: 1.1em');
    expect(sentence1_1).toHaveStyle('fontWeight: bold');
    expect(sentence1_1).toHaveStyle('boxShadow: 0 0 5px rgba(0,0,0,0.3)');
    expect(sentence1_1).toHaveStyle(`backgroundColor: ${RHETORICAL_PURPOSES.ARGUMENT.color}`); // BG remains

    expect(sentence2_1).toHaveStyle('fontSize: 1.1em');
    expect(sentence2_1).toHaveStyle('fontWeight: bold');
    expect(sentence2_1).toHaveStyle('boxShadow: 0 0 5px rgba(0,0,0,0.3)');
    expect(sentence2_1).toHaveStyle(`backgroundColor: ${RHETORICAL_PURPOSES.ARGUMENT.color}`); // BG remains

    // Sentences with other purposeKeys should not be highlighted
    expect(sentence1_2).toHaveStyle('fontSize: 1em');
    expect(sentence1_2).toHaveStyle('fontWeight: normal');
    expect(sentence1_2).toHaveStyle('boxShadow: none');
    expect(sentence1_2).toHaveStyle(`backgroundColor: ${RHETORICAL_PURPOSES.EVIDENCE.color}`);

    expect(sentence2_2).toHaveStyle('fontSize: 1em');
    expect(sentence2_2).toHaveStyle('fontWeight: normal');
    expect(sentence2_2).toHaveStyle('boxShadow: none');
    expect(sentence2_2).toHaveStyle(`backgroundColor: ${RHETORICAL_PURPOSES.CLAIM.color}`);
  });

  // Test 3: Highlighting removal on mouse leave
  test('removes highlighting from all sentences on mouse leave', () => {
    render(<ReconstructedPassage analysisData={mockAnalysisData} />);

    const sentence1_1 = screen.getByText('Sentence 1.1'); // ARGUMENT
    const sentence2_1 = screen.getByText('Sentence 2.1'); // ARGUMENT

    // Enter and then leave
    fireEvent.mouseEnter(sentence1_1);
    fireEvent.mouseLeave(sentence1_1);

    // All sentences should revert to default styles
    expect(sentence1_1).toHaveStyle('fontSize: 1em');
    expect(sentence1_1).toHaveStyle('fontWeight: normal');
    expect(sentence1_1).toHaveStyle('boxShadow: none');
    expect(sentence1_1).toHaveStyle(`backgroundColor: ${RHETORICAL_PURPOSES.ARGUMENT.color}`);

    expect(sentence2_1).toHaveStyle('fontSize: 1em');
    expect(sentence2_1).toHaveStyle('fontWeight: normal');
    expect(sentence2_1).toHaveStyle('boxShadow: none');
    expect(sentence2_1).toHaveStyle(`backgroundColor: ${RHETORICAL_PURPOSES.ARGUMENT.color}`);
  });
});

// Note: The actual `RHETORICAL_PURPOSES` from '../constants' might have different color values
// (e.g., hex vs. rgb). Tests should be adjusted if `toHaveStyle` fails due to format differences.
// The mock `RHETORICAL_PURPOSES` here uses rgb for consistency with how styles are often computed.
// It's also important that `sentence.purposeKey` values in `mockAnalysisData` match keys in this map.
// Added 'UNKNOWN_PURPOSE' to test fallback to NONE.
// Added a paragraph with an empty sentence to test the component's guard against rendering empty text.
// `toBeInTheDocument` and `toHaveStyle` require jest-dom, ensured by `@testing-library/jest-dom` import.
// If running in an environment without a global DOM setup (like Node for Vitest by default without happy-dom/jsdom),
// ensure the test runner is configured for a DOM environment.
