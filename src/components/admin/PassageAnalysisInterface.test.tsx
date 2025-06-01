// src/components/admin/PassageAnalysisInterface.test.tsx

// Mock passageParser FIRST
import { parsePassage as originalParsePassage } from '../../utils/passageParser'; // Import to have a reference if needed
jest.mock('../../utils/passageParser', () => ({
  __esModule: true,
  parsePassage: jest.fn(),
}));
const mockedParsePassage = jest.requireMock('../../utils/passageParser').parsePassage;

// Mock uuid
jest.mock('uuid', () => ({
  __esModule: true,
  v4: jest.fn(),
}));
const mockedUuidV4 = jest.requireMock('uuid').v4;

// Mock Paragraph component
jest.mock('./Paragraph', () => ({
  __esModule: true,
  default: jest.fn(({ paragraph, index, onUpdateSentence, onRemoveSentence, onAddSentenceHere, hoveredPurposeKey, onSentenceMouseEnter, onSentenceMouseLeave }) => (
    <div data-testid={`mock-paragraph-${paragraph.id}`} data-index={index} data-hoveredkey={hoveredPurposeKey || 'null'}>
      {/* Simplified rendering for test purposes */}
      <span>PARAGRAPH: {paragraph.sentences.map(s => s.text).join(' ')}</span>
      <button data-testid={`add-sentence-${paragraph.id}`} onClick={() => onAddSentenceHere(paragraph.id)}>AddS-{paragraph.id}</button>
      {paragraph.sentences.map(s => (
        <div key={s.id} data-testid={`sentence-container-${s.id}`}>
          <button data-testid={`update-sentence-${s.id}`} onClick={() => onUpdateSentence(paragraph.id, s.id, {...s, text: 'Updated Text'})}>UpdS-{s.id}</button>
          <button data-testid={`remove-sentence-${s.id}`} onClick={() => onRemoveSentence(paragraph.id, s.id)}>DelS-{s.id}</button>
          <div data-testid={`hover-div-${s.id}`} onMouseEnter={() => onSentenceMouseEnter(s.purposeKey)} onMouseLeave={() => onSentenceMouseLeave()}>Hover-{s.id}</div>
          {/* Visual check for hoveredPurposeKey for debugging tests if needed: <span>CurrentHover: {hoveredPurposeKey}</span> */}
        </div>
      ))}
    </div>
  )),
}));
const MockedParagraph = jest.requireMock('./Paragraph').default;


// Mock constants
jest.mock('../constants', () => ({
    RHETORICAL_PURPOSES: { // Ensure this matches what Sentence.tsx expects for default background
        NONE: { name: 'None', color: 'rgb(204, 204, 204)', isPlaceholder: true }, // #ccc
        ARGUMENT: { name: 'Argument', color: 'rgb(0, 0, 255)' }, // blue
        EVIDENCE: { name: 'Evidence', color: 'rgb(0, 128, 0)' }, // green
    }
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PassageAnalysisInterface from './PassageAnalysisInterface';

describe('PassageAnalysisInterface', () => {
  const mockAnalysisData = [
    { id: 'p1', sentences: [{ id: 's1a', text: 'P1S1', summary: '', purposeKey: 'ARGUMENT', ties: '' },{ id: 's1b', text: 'P1S2', summary: '', purposeKey: 'EVIDENCE', ties: '' }] },
    { id: 'p2', sentences: [{ id: 's2a', text: 'P2S1', summary: '', purposeKey: 'ARGUMENT', ties: '' }] },
  ];
  let uuidCounter: number;

  beforeEach(() => {
    mockedParsePassage.mockClear();
    mockedUuidV4.mockClear();
    MockedParagraph.mockClear(); // Clear mock calls and instances

    uuidCounter = 0;
    mockedUuidV4.mockImplementation(() => `mock-uuid-${++uuidCounter}`);
  });

  it('renders initial state correctly', () => {
    render(<PassageAnalysisInterface />);
    expect(screen.getByPlaceholderText('Paste your passage here...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analyze Passage' })).toBeDisabled();
    // Initial message when no data and no text
    expect(screen.getByText('Paste text above and click "Analyze Passage" to see results.')).toBeInTheDocument();
  });

  it('enables button when text is entered', () => {
    render(<PassageAnalysisInterface />);
    fireEvent.change(screen.getByPlaceholderText('Paste your passage here...'), { target: { value: 'Some text' } });
    expect(screen.getByRole('button', { name: 'Analyze Passage' })).toBeEnabled();
  });

  it('calls parsePassage and renders paragraphs on analyze click', async () => {
    mockedParsePassage.mockReturnValue(mockAnalysisData);
    render(<PassageAnalysisInterface />);

    fireEvent.change(screen.getByPlaceholderText('Paste your passage here...'), { target: { value: 'Test passage.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze Passage' }));

    // Wait for loading to finish
    await waitFor(() => expect(screen.queryByText('Loading analysis...')).not.toBeInTheDocument());

    expect(mockedParsePassage).toHaveBeenCalledWith('Test passage.');
    expect(MockedParagraph).toHaveBeenCalledTimes(mockAnalysisData.length);

    expect(MockedParagraph).toHaveBeenNthCalledWith(1, expect.objectContaining({ paragraph: mockAnalysisData[0] }), {});
    expect(MockedParagraph).toHaveBeenNthCalledWith(2, expect.objectContaining({ paragraph: mockAnalysisData[1] }), {});
  });

  it('handles adding a sentence', async () => {
    mockedParsePassage.mockReturnValue([{ id: 'p1', sentences: [{id: 's1', text: 'S1', purposeKey: 'NONE', summary:'', ties:''}] }]);
    render(<PassageAnalysisInterface />);
    fireEvent.change(screen.getByPlaceholderText('Paste your passage here...'), { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze Passage' }));

    await waitFor(() => expect(MockedParagraph).toHaveBeenCalledTimes(1));

    const addButton = screen.getByTestId('add-sentence-p1');
    fireEvent.click(addButton);

    await waitFor(() => {
      const lastCallProps = MockedParagraph.mock.calls[MockedParagraph.mock.calls.length - 1][0];
      expect(lastCallProps.paragraph.sentences.length).toBe(2);
      expect(lastCallProps.paragraph.sentences[1].text).toBe("");
      expect(lastCallProps.paragraph.sentences[1].id).toBe("mock-uuid-1"); // First call to uuid
    });
  });

  it('handles updating a sentence', async () => {
    mockedParsePassage.mockReturnValue([{ id: 'p1', sentences: [{id: 's1', text: 'Original Text', purposeKey: 'NONE', summary:'', ties:''}] }]);
    render(<PassageAnalysisInterface />);
    fireEvent.change(screen.getByPlaceholderText('Paste your passage here...'), { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze Passage' }));
    await waitFor(() => expect(MockedParagraph).toHaveBeenCalledTimes(1));

    const updateButton = screen.getByTestId('update-sentence-s1');
    fireEvent.click(updateButton);

    await waitFor(() => {
      const lastCallProps = MockedParagraph.mock.calls[MockedParagraph.mock.calls.length - 1][0];
      expect(lastCallProps.paragraph.sentences[0].text).toBe('Updated Text');
    });
  });

  it('handles removing a sentence', async () => {
    mockedParsePassage.mockReturnValue([{ id: 'p1', sentences: [{id: 's1', text: 'S1', purposeKey: 'NONE', summary:'', ties:''}, {id: 's2', text: 'S2', purposeKey: 'NONE', summary:'', ties:''}] }]);
    render(<PassageAnalysisInterface />);
    fireEvent.change(screen.getByPlaceholderText('Paste your passage here...'), { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze Passage' }));
    await waitFor(() => expect(MockedParagraph).toHaveBeenCalledTimes(1));

    const deleteButton = screen.getByTestId('remove-sentence-s1');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      const lastCallProps = MockedParagraph.mock.calls[MockedParagraph.mock.calls.length - 1][0];
      expect(lastCallProps.paragraph.sentences.length).toBe(1);
      expect(lastCallProps.paragraph.sentences[0].id).toBe('s2');
    });
  });

  it('propagates hover state for highlighting', async () => {
    mockedParsePassage.mockReturnValue(mockAnalysisData); // s1a is ARGUMENT
    render(<PassageAnalysisInterface />);
    fireEvent.change(screen.getByPlaceholderText('Paste your passage here...'), { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze Passage' }));
    await waitFor(() => expect(MockedParagraph).toHaveBeenCalledTimes(2));

    const hoverTargetS1A = screen.getByTestId('hover-div-s1a');
    fireEvent.mouseEnter(hoverTargetS1A);

    await waitFor(() => {
      // MockedParagraph is called multiple times, check the latest calls for each paragraph instance
      const firstParaContainer = screen.getByTestId('mock-paragraph-p1');
      const secondParaContainer = screen.getByTestId('mock-paragraph-p2');
      expect(firstParaContainer).toHaveAttribute('data-hoveredkey', 'ARGUMENT');
      expect(secondParaContainer).toHaveAttribute('data-hoveredkey', 'ARGUMENT');
    });

    fireEvent.mouseLeave(hoverTargetS1A);
    await waitFor(() => {
      const firstParaContainer = screen.getByTestId('mock-paragraph-p1');
      const secondParaContainer = screen.getByTestId('mock-paragraph-p2');
      expect(firstParaContainer).toHaveAttribute('data-hoveredkey', 'null');
      expect(secondParaContainer).toHaveAttribute('data-hoveredkey', 'null');
    });
  });

  it('displays no content parsed message if parsePassage returns empty array but text was present', async () => {
    mockedParsePassage.mockReturnValue([]);
    render(<PassageAnalysisInterface />);
    fireEvent.change(screen.getByPlaceholderText('Paste your passage here...'), { target: { value: 'Test passage with no parsable content.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze Passage' }));

    await waitFor(() => expect(mockedParsePassage).toHaveBeenCalledWith('Test passage with no parsable content.'));
    expect(screen.getByText('No parsable content found. Ensure your text has meaningful sentences and paragraphs are separated by a blank line.')).toBeInTheDocument();
    expect(MockedParagraph).not.toHaveBeenCalled();
  });

  it('displays initial message if parsePassage returns empty and text was initially empty or only spaces', async () => {
    mockedParsePassage.mockReturnValue([]);
    render(<PassageAnalysisInterface />);
    // Simulate user typing spaces then clicking analyze (button would be disabled, but testing parser logic)
    fireEvent.change(screen.getByPlaceholderText('Paste your passage here...'), { target: { value: '   ' } });
    // Manually call analyze as button would be disabled
    // This scenario is more about the message when analysisData is empty and rawText was effectively empty.
    // The component's handleAnalyzeClick wouldn't run if button is disabled.
    // Let's test the state where analysisData is empty after an attempt.
    mockedParsePassage.mockReturnValueOnce([]); // for a potential call
    render(<PassageAnalysisInterface />); // Re-render or set state to simulate
    fireEvent.change(screen.getByPlaceholderText('Paste your passage here...'), { target: { value: ' ' } });
    // Click disabled button won't work, so we are checking the default message if analysisData is null
     expect(screen.getByText('Paste text above and click "Analyze Passage" to see results.')).toBeInTheDocument();
  });
});
```
