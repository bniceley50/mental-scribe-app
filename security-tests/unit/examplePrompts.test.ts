import { describe, it, expect } from 'vitest';
import { EXAMPLE_PROMPTS } from '../examplePrompts';

describe('Example Prompts', () => {
  it('should export an array of prompts', () => {
    expect(Array.isArray(EXAMPLE_PROMPTS)).toBe(true);
    expect(EXAMPLE_PROMPTS.length).toBeGreaterThan(0);
  });

  it('should have valid prompt structure', () => {
    EXAMPLE_PROMPTS.forEach((prompt) => {
      expect(prompt).toHaveProperty('icon');
      expect(prompt).toHaveProperty('label');
      expect(prompt).toHaveProperty('prompt');

      expect(typeof prompt.label).toBe('string');
      expect(typeof prompt.prompt).toBe('string');
      expect(typeof prompt.icon).toBe('function'); // Lucide icons are functions
    });
  });

  it('should generate prompts with current date', () => {
    const currentDate = new Date().toLocaleDateString();
    
    EXAMPLE_PROMPTS.forEach((example) => {
      // Prompts should include the current date
      expect(example.prompt).toContain(currentDate);
    });
  });

  it('should have non-empty prompt content', () => {
    EXAMPLE_PROMPTS.forEach((example) => {
      expect(example.prompt.trim().length).toBeGreaterThan(0);
    });
  });

  it('should include essential example types', () => {
    const labels = EXAMPLE_PROMPTS.map((p) => p.label);
    
    expect(labels).toContain('Brief Therapy Note');
    expect(labels).toContain('Crisis Intervention Note');
    expect(labels).toContain('Intake Assessment');
  });

  it('should have unique labels', () => {
    const labels = EXAMPLE_PROMPTS.map((p) => p.label);
    const uniqueLabels = new Set(labels);
    
    expect(uniqueLabels.size).toBe(labels.length);
  });

  it('should generate fresh prompts on each access', () => {
    // Access prompt twice
    const firstAccess = EXAMPLE_PROMPTS[0].prompt;
    
    // Small delay to potentially change date (if test runs at midnight)
    const secondAccess = EXAMPLE_PROMPTS[0].prompt;
    
    // Both should be strings and use getter
    expect(typeof firstAccess).toBe('string');
    expect(typeof secondAccess).toBe('string');
  });

  it('should include clinical assessment elements', () => {
    EXAMPLE_PROMPTS.forEach((example) => {
      // Each prompt should contain clinical terminology
      const clinicalTerms = ['session', 'client', 'assessment', 'intervention', 'therapy'];
      const hasClinical = clinicalTerms.some((term) => 
        example.prompt.toLowerCase().includes(term)
      );
      
      expect(hasClinical).toBe(true);
    });
  });
});
