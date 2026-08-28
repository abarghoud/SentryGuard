'use client';

interface FormattedDateProps {
  date: string | Date;
  locale?: string;
  className?: string;
}

export function FormattedDate({ date, locale, className }: FormattedDateProps) {
  const iso = typeof date === 'string' ? date : date.toISOString();
  let formattedDate: string;
  try {
    const parsed = typeof date === 'string' ? new Date(date) : date;
    formattedDate = new Intl.DateTimeFormat(locale || undefined, {
      dateStyle: 'medium',
    }).format(parsed);
  } catch {
    formattedDate = typeof date === 'string' ? date : date.toLocaleDateString();
  }

  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {formattedDate}
    </time>
  );
}
