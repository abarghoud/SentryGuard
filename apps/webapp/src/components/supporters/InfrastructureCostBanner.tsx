interface InfrastructureCostBannerProps {
  title: string;
  description: string;
  telemetryTitle: string;
  telemetryDesc: string;
  notificationsTitle: string;
  notificationsDesc: string;
  openSourceTitle: string;
  openSourceDesc: string;
}

export function InfrastructureCostBanner({
  title,
  description,
  telemetryTitle,
  telemetryDesc,
  notificationsTitle,
  notificationsDesc,
  openSourceTitle,
  openSourceDesc,
}: InfrastructureCostBannerProps) {
  return (
    <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white rounded-3xl p-8 md:p-10 shadow-xl border border-gray-700">
      <div className="max-w-3xl mb-8">
        <h3 className="text-2xl md:text-3xl font-bold mb-3 bg-gradient-to-r from-white via-gray-100 to-gray-300 text-transparent bg-clip-text">
          {title}
        </h3>
        <p className="text-gray-300 text-sm md:text-base leading-relaxed">
          {description}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-white/10">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center mb-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h4 className="font-semibold text-white text-base mb-1">{telemetryTitle}</h4>
          <p className="text-xs text-gray-400 leading-relaxed">{telemetryDesc}</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-white/10">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h4 className="font-semibold text-white text-base mb-1">{notificationsTitle}</h4>
          <p className="text-xs text-gray-400 leading-relaxed">{notificationsDesc}</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-white/10">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h4 className="font-semibold text-white text-base mb-1">{openSourceTitle}</h4>
          <p className="text-xs text-gray-400 leading-relaxed">{openSourceDesc}</p>
        </div>
      </div>
    </div>
  );
}
