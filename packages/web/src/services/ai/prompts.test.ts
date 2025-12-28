import { describe, it, expect } from 'vitest';
import { PromptRegistry } from './prompts';

describe('PromptRegistry', () => {
  it('should return the correct prompt for a valid feature and version', () => {
    const feature = 'menuGenerator';
    const version = '1.0';
    const definition = PromptRegistry.getPrompt(feature, {}, version);

    expect(definition).toBeDefined();
    expect(definition.version).toBe(version);
    expect(typeof definition.systemInstruction).toBe('string');
    expect(typeof definition.userPromptTemplate).toBe('function');
  });

  it('should fallback to version 1.0 if the requested version does not exist', () => {
    const feature = 'menuGenerator';
    const version = '99.0'; // Non-existent
    const definition = PromptRegistry.getPrompt(feature, {}, version);

    expect(definition).toBeDefined();
    expect(definition.version).toBe('1.0');
  });

  it('should return a universal prompt for an unknown feature', () => {
    const feature = 'unknownFeature';
    const definition = PromptRegistry.getPrompt(feature, {});

    expect(definition).toBeDefined();
    expect(definition.systemInstruction).toContain('professional Executive Chef');
  });

  it('should correctly render the menuGenerator template with context', () => {
    const feature = 'menuGenerator';
    const context = {
      eventType: 'Boda',
      pax: 100,
      season: 'Verano',
      restrictions: ['Vegano', 'Sin Gluten'],
    };
    const definition = PromptRegistry.getPrompt(feature, context);
    const rendered = definition.userPromptTemplate(context);

    expect(rendered).toContain('Event type: "Boda"');
    expect(rendered).toContain('Number of guests: 100');
    expect(rendered).toContain('Season: Verano');
    expect(rendered).toContain('Vegano, Sin Gluten');
  });

  it('should correctly render the inventoryOptimization template', () => {
    const feature = 'inventoryOptimization';
    const context = {
      totalFuturePax: 500,
      ingredientsJson: '[{"id":"1", "name":"Sal"}]',
    };
    const definition = PromptRegistry.getPrompt(feature, context);
    const rendered = definition.userPromptTemplate(context);

    expect(rendered).toContain('PAX previstos (próximas 2 semanas): 500');
    expect(rendered).toContain('[{"id":"1", "name":"Sal"}]');
    expect(rendered).toContain('Safety Stock Calculation');
  });

  it('should correctly render the purchaseSuggestion template', () => {
    const feature = 'purchaseSuggestion';
    const context = {
      inventoryJson: '{"items":[]}',
      budget: '5000',
    };
    const definition = PromptRegistry.getPrompt(feature, context);
    const rendered = definition.userPromptTemplate(context);

    expect(rendered).toContain('PRESUPUESTO DISPONIBLE: 5000 EUR');
    expect(rendered).toContain('{"items":[]}');
  });

  it('should correctly render the wasteAnalysis template', () => {
    const feature = 'wasteAnalysis';
    const context = {
      wasteRecordsJson: '[]',
      contextJson: '{}',
    };
    const definition = PromptRegistry.getPrompt(feature, context);
    const rendered = definition.userPromptTemplate(context);

    expect(rendered).toContain('DATOS DE MERMAS:');
    expect(rendered).toContain('Pareto Analysis');
  });
});
