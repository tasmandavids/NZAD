type TranslateFn = (key: string, values?: Record<string, string | number | Date>) => string;

export function templateLabel(t: TranslateFn, id: string): string {
  return t(`templates.${id}.label`);
}

export function templateDescription(t: TranslateFn, id: string): string {
  return t(`templates.${id}.description`);
}

export function typographyPairLabel(t: TranslateFn, id: string): string {
  return t(`typography.pairs.${id}.label`);
}

export function typographyPairDescription(t: TranslateFn, id: string): string {
  return t(`typography.pairs.${id}.description`);
}

export function typographyCategoryLabel(t: TranslateFn, id: string): string {
  return t(`typography.categories.${id}`);
}

export function templateCategoryLabel(t: TranslateFn, id: string): string {
  return t(`templateCategories.${id}`);
}

export function blockLabel(t: TranslateFn, type: string): string {
  return t(`blocks.${type}`);
}

export function setupPageLabel(t: TranslateFn, id: string): string {
  return t(`setupPages.${id}`);
}
