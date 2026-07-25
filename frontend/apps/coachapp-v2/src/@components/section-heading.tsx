// The single compact section caption for builder/detail/summary chrome (NOT
// form sections — those use Fieldset.Legend). One uppercase-muted token instead
// of ad-hoc span / Typography / type-eyebrow / type-eyebrow variants.

// `tracking-eyebrow`, not `tracking-wider`: the designs put `.eyebrow` at
// letter-spacing .09em and `tracking-wider` is .05em. `--tracking-eyebrow` has
// held the right value all along — this heading just never used it.
export default function SectionHeading({title, className = 'mb-3'}: {title: string; className?: string}) {
  return <h3 className={`type-eyebrow font-semibold uppercase tracking-eyebrow text-muted ${className}`}>{title}</h3>;
}
