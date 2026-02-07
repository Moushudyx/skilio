// Lazy-load ESM-only trash from CJS output.
export const moveToTrash = async (target: string) => {
  const mod = await import('trash');
  await mod.default(target);
};
