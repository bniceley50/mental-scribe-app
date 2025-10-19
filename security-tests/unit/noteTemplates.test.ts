import { describe, it, expect } from 'vitest';
import { NOTE_TEMPLATES } from '../noteTemplates';

describe('Note Templates', () => {
  it('should export an array of templates', () => {
    expect(Array.isArray(NOTE_TEMPLATES)).toBe(true);
    expect(NOTE_TEMPLATES.length).toBeGreaterThan(0);
  });

  it('should have valid template structure', () => {
    NOTE_TEMPLATES.forEach((template) => {
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('content');
      expect(template).toHaveProperty('category');

      expect(typeof template.id).toBe('string');
      expect(typeof template.name).toBe('string');
      expect(typeof template.description).toBe('string');
      expect(typeof template.content).toBe('string');
      expect(typeof template.category).toBe('string');
    });
  });

  it('should have unique template IDs', () => {
    const ids = NOTE_TEMPLATES.map((t) => t.id);
    const uniqueIds = new Set(ids);
    
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have non-empty template content', () => {
    NOTE_TEMPLATES.forEach((template) => {
      expect(template.content.trim().length).toBeGreaterThan(0);
    });
  });

  it('should have valid categories', () => {
    const validCategories = [
      'SOAP Notes',
      'Progress Tracking',
      'Crisis Intervention',
      'Intake/Assessment',
      'Termination',
    ];

    NOTE_TEMPLATES.forEach((template) => {
      expect(validCategories).toContain(template.category);
    });
  });

  it('should include essential templates', () => {
    const essentialTemplates = ['soap-basic', 'progress-note', 'crisis-template', 'intake-template'];
    const templateIds = NOTE_TEMPLATES.map((t) => t.id);

    essentialTemplates.forEach((essentialId) => {
      expect(templateIds).toContain(essentialId);
    });
  });

  it('should have properly formatted template placeholders', () => {
    NOTE_TEMPLATES.forEach((template) => {
      // Check for common placeholders
      const hasPlaceholders = 
        template.content.includes('[') || 
        template.content.includes(':');
      
      expect(hasPlaceholders).toBe(true);
    });
  });
});
