import Link from 'next/link';
import { SupporterItem } from '@/core/buymeacoffee/buymeacoffee.types';

interface SupportersSocialProofProps {
  locale: string;
  supporters: SupporterItem[];
  totalCoffeesCount: number;
  title: string;
  subtitle: string;
  description: string;
  viewAllText: string;
  supportCtaText: string;
  statsSummary?: string;
}

const BMC_URL = 'https://buymeacoffee.com/sentryguardorg';

export function SupportersSocialProof({
  locale,
  supporters,
  totalCoffeesCount,
  title,
  subtitle,
  description,
  viewAllText,
  supportCtaText,
  statsSummary,
}: SupportersSocialProofProps) {
  const topSupporters = supporters.slice(0, 6);

  return (
    <section className="container mx-auto px-6 py-16">
      <div className="max-w-5xl mx-auto bg-gradient-to-br from-red-50/60 via-white to-amber-50/50 rounded-3xl p-8 sm:p-12 border border-red-100 shadow-sm">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100/80 text-red-700 text-xs font-semibold uppercase tracking-wider mb-4 border border-red-200">
            <span>❤️</span>
            <span>{subtitle}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
            {title}
          </h2>
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
            {description}
          </p>
        </div>

        {topSupporters.length > 0 ? (
          <div className="mb-10">
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-3xl mx-auto">
              {topSupporters.map((supporter) => {
                const isTop = supporter.coffees >= 10;
                const initial = (supporter.name || 'A').charAt(0).toUpperCase();

                return (
                  <div
                    key={supporter.id}
                    className={`inline-flex items-center gap-2.5 px-3.5 py-2 rounded-full border shadow-2xs transition-transform hover:scale-105 duration-150 ${
                      isTop
                        ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                        : 'bg-white border-gray-200 text-gray-800'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        isTop
                          ? 'bg-amber-500 text-white'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {isTop ? '👑' : initial}
                    </div>
                    <span className="text-sm font-semibold truncate max-w-[120px]">
                      {supporter.name}
                    </span>
                    {supporter.isSubscriber ? (
                      <span className="text-xs text-amber-600 font-bold">
                        ⭐
                      </span>
                    ) : null}
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600 font-medium">
                      x{supporter.coffees}
                    </span>
                  </div>
                );
              })}
            </div>

            {statsSummary ? (
              <p className="text-center text-xs sm:text-sm text-gray-500 mt-4">
                {statsSummary}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href={`/${locale}/supporters`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-medium shadow-sm transition-all duration-200 hover:shadow-md"
          >
            <span>{viewAllText}</span>
            <span>→</span>
          </Link>
          <a
            href={BMC_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm transition-all duration-200 hover:shadow-md"
          >
            <span>☕</span>
            <span>{supportCtaText}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
