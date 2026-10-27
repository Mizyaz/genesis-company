// Kept free of imports: scripts/export-story-data.mjs loads it to replace each layout cell by its kind.
export type Kind = 'pad' | 'rfpad' | 'resistor' | 'inductor' | 'pixelated' | 'transistor';

// A member's kind, from its layout cell: a pixel cell (pix_) is a pixelated passive device, other inductor cells inductors.
export const kindOf = (cell: string): Kind => /pad_mmw|rfpad/i.test(cell) ? 'rfpad' : /pad/i.test(cell) ? 'pad' : /res/i.test(cell) ? 'resistor' : /^pix_|^pixelated$/i.test(cell) ? 'pixelated' : /ind/i.test(cell) ? 'inductor' : 'transistor';
