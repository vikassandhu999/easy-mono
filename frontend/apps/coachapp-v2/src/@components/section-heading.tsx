// The single compact section caption for builder/detail/summary chrome (NOT
// form sections — those use Fieldset.Legend). One uppercase-muted token instead
// of ad-hoc span / Typography / type-eyebrow / type-eyebrow variants.

// The treatment is the theme's `.eyebrow` (size, weight, .09em tracking, uppercase,
// muted) — this component only decides that a section caption is an `<h3>`. A stat
// label wears the same class on a `<span>`, so neither spells the treatment out.
export default function SectionHeading({title, className = 'mb-3'}: {title: string; className?: string}) {
  return <h3 className={`eyebrow ${className}`}>{title}</h3>;
}
