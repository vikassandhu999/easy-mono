import type {PublicStoreProfile} from './types';

/**
 * Trust bar — horizontal strip of stats immediately below the hero.
 * Server Component — no interactivity needed.
 */
export default function TrustBar({stats}: {stats: PublicStoreProfile['trust_stats']}) {
  if (stats.length === 0) return null;

  return (
    <section className="border-y border-gray-200 bg-white py-6">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-6 px-4 sm:gap-10 sm:px-6">
        {stats.map((stat, i) => (
          <div
            className="flex flex-col items-center text-center"
            key={i}
          >
            <span className="text-lg font-bold text-gray-900">{stat.value}</span>
            <span className="text-xs text-gray-500">{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
