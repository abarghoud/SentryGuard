import { getAppStoreUrls } from '@/core/site';

interface StoreBadgesProps {
  className?: string;
}

export function StoreBadges({ className = '' }: StoreBadgesProps) {
  const { appStoreUrl, googlePlayUrl } = getAppStoreUrls();

  if (!appStoreUrl && !googlePlayUrl) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-4 ${className}`}>
      {appStoreUrl ? (
        <a href={appStoreUrl} target="_blank" rel="noopener noreferrer">
          <img
            src="/images/badges/app-store.svg"
            alt="Download on the App Store"
            width={135}
            height={40}
            className="h-12 w-auto"
          />
        </a>
      ) : null}
      {googlePlayUrl ? (
        <a href={googlePlayUrl} target="_blank" rel="noopener noreferrer">
          <img
            src="/images/badges/google-play.svg"
            alt="Get it on Google Play"
            width={180}
            height={54}
            className="h-12 w-auto"
          />
        </a>
      ) : null}
    </div>
  );
}
