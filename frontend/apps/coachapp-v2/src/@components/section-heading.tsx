// The single compact section caption for builder/detail/summary chrome (NOT
// form sections — those use Fieldset.Legend). One uppercase-muted token instead
// of ad-hoc span / Typography / text-[9px] / text-[10px] variants.

export default function SectionHeading({title}: {title: string}) {
  return <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">{title}</h3>;
}
