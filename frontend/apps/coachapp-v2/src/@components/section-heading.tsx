// The single compact section caption for builder/detail/summary chrome (NOT
// form sections — those use Fieldset.Legend). One uppercase-muted token instead
// of ad-hoc span / Typography / type-eyebrow / type-eyebrow variants.

export default function SectionHeading({title, className = 'mb-3'}: {title: string; className?: string}) {
  return <h3 className={`type-eyebrow font-semibold uppercase tracking-wider text-muted ${className}`}>{title}</h3>;
}
