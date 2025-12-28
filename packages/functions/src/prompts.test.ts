import { describe, it, expect } from 'vitest';
import { generateSocialChefPrompt, generateSocialManagerPrompt } from './prompts';

describe('Prompts', () => {
  describe('generateSocialChefPrompt', () => {
    it('should explicitly request strict JSON format', () => {
      const prompt = generateSocialChefPrompt('Tortilla Española', 'RESTAURANT');
      expect(prompt).toContain('GENERA (formato JSON estricto):');
      expect(prompt).toContain('"copy":');
      expect(prompt).toContain('"hashtags":');
    });

    it('should include correct business type context', () => {
      const prompt = generateSocialChefPrompt('Paella', 'HOTEL');
      expect(prompt).toContain('TIPO DE NEGOCIO: HOTEL');
    });

    it('should mention relaxed character limits', () => {
      const prompt = generateSocialChefPrompt('Test', 'RESTAURANT');
      expect(prompt).toContain('100-280 caracteres');
    });
  });

  describe('generateSocialManagerPrompt', () => {
    it('should generate prompt for EVENT content', () => {
      const prompt = generateSocialManagerPrompt('EVENTO', 'HOTEL');
      expect(prompt).toContain('TIPO DE CONTENIDO: Evento');
      expect(prompt).toContain('FOMO');
    });

    it('should include LinkedIn for HOTEL business type', () => {
      const prompt = generateSocialManagerPrompt('GENERAL', 'HOTEL');
      expect(prompt).toContain('"linkedin": {');
    });

    it('should NOT include LinkedIn for RESTAURANT business type', () => {
      const prompt = generateSocialManagerPrompt('GENERAL', 'RESTAURANT');
      expect(prompt).not.toContain('"linkedin": {');
    });

    it('should request specific JSON structure', () => {
      const prompt = generateSocialManagerPrompt('PROMOCION', 'RESTAURANT');
      expect(prompt).toContain('"analysis": {');
      expect(prompt).toContain('"content": {');
      expect(prompt).toContain('"instagram": {');
    });
  });
});
