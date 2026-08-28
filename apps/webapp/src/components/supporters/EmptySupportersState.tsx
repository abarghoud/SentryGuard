interface EmptySupportersStateProps {
  title: string;
  description: string;
  ctaText: string;
  bmcUrl: string;
}

export function EmptySupportersState({
  title,
  description,
  ctaText,
  bmcUrl,
}: EmptySupportersStateProps) {
  return (
    <div className="text-center py-12 px-6 bg-white rounded-3xl border border-gray-200 shadow-sm max-w-xl mx-auto">
      <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 text-2xl">
        ☕
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm mb-6 leading-relaxed">{description}</p>
      <a
        href={bmcUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-6 py-3 bg-[#FFDD00] hover:bg-[#FFEA00] text-gray-900 font-bold rounded-xl shadow transition-all duration-200 hover:scale-105"
      >
        <span>☕</span>
        <span>{ctaText}</span>
      </a>
    </div>
  );
}
