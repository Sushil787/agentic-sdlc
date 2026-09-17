import type { RenderContext } from './types.js';

/**
 * Tiny mustache-ish renderer: `{{key}}` substitution plus `{{#if key}}...{{/if}}`
 * blocks, so a template can drop a section when the project has no such command
 * (a repo with no typecheck script should not get "run ''").
 */
export function render(template: string, context: RenderContext): string {
  const values = context as unknown as Record<string, string>;

  const withBlocks = template.replace(
    /\{\{#if (\w+)\}\}\n?([\s\S]*?)\{\{\/if\}\}\n?/g,
    (_match, key: string, body: string) => {
      const value = values[key];
      return value === undefined || value === '' ? '' : body;
    },
  );

  return withBlocks.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : value;
  });
}
