import { parsePassage } from './passageParser';
import type { AnalysisData } from '../../src/types/admin.d.ts'; // For type checking results

// Mocking uuid to ensure predictable IDs for some tests could be an option,
// but for now, we'll rely on format checking (toMatch) for IDs.

describe('parsePassage', () => {
  it('should return an empty array for empty or whitespace input', () => {
    expect(parsePassage('')).toEqual([]);
    expect(parsePassage('   ')).toEqual([]);
    expect(parsePassage('\n \n')).toEqual([]);
  });

  it('should parse a single paragraph with multiple sentences', () => {
    const text = 'Sentence one. Sentence two! Sentence three?';
    const result = parsePassage(text);
    expect(result.length).toBe(1);
    expect(result[0].sentences.length).toBe(3);
    expect(result[0].sentences[0].text).toBe('Sentence one.');
    expect(result[0].sentences[1].text).toBe('Sentence two!');
    expect(result[0].sentences[2].text).toBe('Sentence three?');
    result[0].sentences.forEach(s => {
      expect(s.purposeKey).toBe('NONE');
      expect(s.summary).toBe('');
      expect(s.ties).toBe('');
    });
  });

  it('should parse multiple paragraphs separated by one or more empty lines', () => {
    const text = 'Paragraph one, sentence one. P1S2.\n\nParagraph two, sentence one. P2S2!\n\n\nParagraph three.';
    const result = parsePassage(text);
    expect(result.length).toBe(3);
    expect(result[0].sentences.length).toBe(2);
    expect(result[0].sentences[0].text).toBe('Paragraph one, sentence one.');
    expect(result[0].sentences[1].text).toBe('P1S2.');
    expect(result[1].sentences.length).toBe(2);
    expect(result[1].sentences[0].text).toBe('Paragraph two, sentence one.');
    expect(result[1].sentences[1].text).toBe('P2S2!');
    expect(result[2].sentences.length).toBe(1);
    expect(result[2].sentences[0].text).toBe('Paragraph three.');
  });

  it('should handle sentences with various terminators correctly', () => {
    const text = 'Ends with period. Ends with question mark? Ends with exclamation!';
    const result = parsePassage(text);
    expect(result.length).toBe(1);
    expect(result[0].sentences.length).toBe(3);
    expect(result[0].sentences[0].text).toBe('Ends with period.');
    expect(result[0].sentences[1].text).toBe('Ends with question mark?');
    expect(result[0].sentences[2].text).toBe('Ends with exclamation!');
  });

  it('should assign unique IDs to paragraphs and sentences', () => {
    const text = 'First sentence. Second sentence.\n\nThird sentence.';
    const result = parsePassage(text);

    expect(result.length).toBe(2); // 2 paragraphs
    expect(result[0].sentences.length).toBe(2);
    expect(result[1].sentences.length).toBe(1);

    // Check ID formats
    expect(result[0].id).toMatch(/^p-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);
    result[0].sentences.forEach(s => {
      expect(s.id).toMatch(/^s-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);
    });
    expect(result[1].id).toMatch(/^p-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);
    expect(result[1].sentences[0].id).toMatch(/^s-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);

    // Check ID uniqueness
    expect(result[0].id).not.toBe(result[1].id);
    expect(result[0].sentences[0].id).not.toBe(result[0].sentences[1].id);
    if (result[0].sentences.length > 0 && result[1].sentences.length > 0) {
      expect(result[0].sentences[0].id).not.toBe(result[1].sentences[0].id);
    }
  });

  it('should trim whitespace from sentences and paragraphs effectively', () => {
    const text = '  Sentence with leading/trailing spaces.  \n\n  Another one.  \n\nYet another one with space before period .';
    const result = parsePassage(text);
    expect(result.length).toBe(3);
    expect(result[0].sentences[0].text).toBe('Sentence with leading/trailing spaces.');
    expect(result[1].sentences[0].text).toBe('Another one.');
    expect(result[2].sentences[0].text).toBe('Yet another one with space before period .'); // Regex should handle space before period
  });

  it('should skip paragraphs that are purely whitespace or become empty after split', () => {
    const text = 'Paragraph 1.\n\n   \n\nParagraph 3.\n\n\t\n\nParagraph 5.';
    const result = parsePassage(text);
    expect(result.length).toBe(3);
    expect(result[0].sentences[0].text).toBe('Paragraph 1.');
    expect(result[1].sentences[0].text).toBe('Paragraph 3.');
    expect(result[2].sentences[0].text).toBe('Paragraph 5.');
  });

  it('should handle text without standard sentence terminators as a single sentence', () => {
    const text = 'This is a single line without a period';
    const result = parsePassage(text);
    expect(result.length).toBe(1);
    expect(result[0].sentences.length).toBe(1);
    expect(result[0].sentences[0].text).toBe('This is a single line without a period');
  });

  it('should handle text with only terminators gracefully', () => {
    const text = '...!!!???';
    const result = parsePassage(text);
    // Depending on regex, this might be empty or one sentence with "..."
    // The current regex /[^.!?]+(?:[.!?](?=\s|$)|[.!?]$)?/g will likely result in 0 sentences as it requires non-punctuation characters.
    expect(result.length).toBe(1); // One paragraph
    expect(result[0].sentences.length).toBe(0); // No valid sentences
  });

  it('should correctly parse sentences when newlines are within them but not for paragraph breaks', () => {
    const text = 'This is a sentence\nthat spans multiple lines but is one sentence. This is another one.\n\nNew paragraph.';
    const result = parsePassage(text);
    expect(result.length).toBe(2);
    expect(result[0].sentences.length).toBe(2);
    expect(result[0].sentences[0].text).toBe('This is a sentence\nthat spans multiple lines but is one sentence.');
    expect(result[0].sentences[1].text).toBe('This is another one.');
    expect(result[1].sentences.length).toBe(1);
    expect(result[1].sentences[0].text).toBe('New paragraph.');
  });
});
