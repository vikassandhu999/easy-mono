// The redesign's input skin: 44px target, hairline border, flat surface.
// Baked into FormTextField/FormSelectField/NumberInput; import it only for
// raw HeroUI inputs those wrappers can't cover.
export const INPUT_SKIN_CLASS = 'min-h-11 border border-border bg-surface shadow-none sm:min-h-10';

export const RESPONSIVE_FORM_SECTION_CLASS =
  'bg-background sm:rounded-card sm:border sm:border-border sm:bg-surface sm:p-6';

// The mobile sticky action footer: full-bleed bar pinned to the viewport bottom,
// dissolving into plain inline actions at sm. Compose justify/margin per site.
export const STICKY_FOOTER_CLASS =
  'sticky bottom-0 z-10 -mx-4 mt-auto flex items-center gap-3 border-t border-border bg-surface px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0';
