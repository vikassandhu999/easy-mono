// The single compact section caption for builder/detail/summary chrome (NOT
// form sections — those use Fieldset.Legend). One uppercase-muted token instead
// of ad-hoc span / Typography / text-eyebrow / text-eyebrow variants.

export default function SectionHeading({title, className = 'mb-3'}: {title: string; className?: string}) {
  return <h3 className={`text-eyebrow font-semibold uppercase tracking-wider text-muted ${className}`}>{title}</h3>;
}
