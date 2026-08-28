import { SupporterItem } from '@/core/buymeacoffee/buymeacoffee.types';
import { FormattedDate } from '@/components/FormattedDate';

interface SupporterCardProps {
  supporter: SupporterItem;
  locale?: string;
}

export function SupporterCard({ locale, supporter }: SupporterCardProps) {
  const initial = supporter.name.charAt(0).toUpperCase();
  const isTopSupporter = supporter.coffees >= 10;
  const isSuperSupporter = supporter.coffees >= 5 && supporter.coffees < 10;

  const cardBorderClass = isTopSupporter
    ? 'bg-gradient-to-br from-amber-50/70 via-white to-yellow-50/40 border-amber-300 ring-1 ring-amber-200 shadow-sm'
    : isSuperSupporter
    ? 'bg-gradient-to-br from-red-50/40 via-white to-orange-50/20 border-red-200 shadow-sm'
    : 'bg-white border-gray-200 shadow-sm';

  const avatarBgClass = isTopSupporter
    ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-white'
    : 'bg-red-100 text-red-600';

  return (
    <div
      className={`flex flex-col justify-between p-5 rounded-2xl border hover:shadow-md transition-all duration-200 ${cardBorderClass}`}
    >
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className={`w-10 h-10 shrink-0 rounded-full font-bold text-sm flex items-center justify-center shadow-xs ${avatarBgClass}`}
            >
              {isTopSupporter ? '👑' : initial}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-gray-900 text-base truncate" title={supporter.name}>
                {supporter.name}
              </h4>
              <FormattedDate date={supporter.supportDate} locale={locale} className="text-xs text-gray-500 block truncate" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            {supporter.isSubscriber ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
                ⭐ {supporter.monthlyCoffees ? `x${supporter.monthlyCoffees}/mo` : 'Membre'}
              </span>
            ) : null}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isTopSupporter
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : isSuperSupporter
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              ☕ x{supporter.coffees}
            </span>
          </div>
        </div>

        {supporter.message ? (
          <div className="mt-2 text-sm text-gray-700 bg-gray-50/80 p-3 rounded-xl border border-gray-100 italic">
            &ldquo;{supporter.message}&rdquo;
          </div>
        ) : null}
      </div>
    </div>
  );
}
