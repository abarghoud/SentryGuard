const SPAM_OR_LINK_REGEX =
  /(https?:\/\/|www\.|t\.me\/|discord\.gg\/|0x[a-fA-F0-9]{20,}|\.(com|org|net|io|xyz|ru|cn|top|app|dev|link|me|vip)\b)/i;

const PROFANITIES = [
  'hitler',
  'nazi',
  'nigger',
  'nigga',
  'faggot',
  'pedophile',
  'putain',
  'salope',
  'connard',
  'encule',
  'enculé',
  'bitch',
  'whore',
  'cunt',
  'dick',
  'fuck',
];

export function isProfaneOrSpam(text: string): boolean {
  if (!text) {
    return false;
  }

  if (SPAM_OR_LINK_REGEX.test(text)) {
    return true;
  }

  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return PROFANITIES.some((word) => normalized.includes(word));
}

export function sanitizeName(rawName?: string | null, isPrivate = false): string {
  if (isPrivate || !rawName) {
    return 'Anonyme';
  }

  const trimmed = rawName.replace(/^["']|["']$/g, '').trim();
  const withoutEmail = trimmed.includes('@') && !trimmed.startsWith('@')
    ? trimmed.split('@')[0]
    : trimmed;

  if (
    !withoutEmail ||
    isProfaneOrSpam(withoutEmail) ||
    withoutEmail.toLowerCase() === 'someone' ||
    withoutEmail.toLowerCase() === 'anonymous' ||
    withoutEmail.toLowerCase() === 'anonyme' ||
    withoutEmail.toLowerCase() === 'supporter'
  ) {
    return 'Anonyme';
  }

  return withoutEmail.length > 30 ? `${withoutEmail.slice(0, 27)}...` : withoutEmail;
}

export function sanitizeMessage(rawMessage?: string | null, isPrivate = false): string | undefined {
  if (isPrivate || !rawMessage) {
    return undefined;
  }

  const trimmed = rawMessage.replace(/^["']|["']$/g, '').trim();
  if (!trimmed || isProfaneOrSpam(trimmed)) {
    return undefined;
  }

  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
}

export function isPrivateSupporter(data: Record<string, unknown>): boolean {
  const flags = [
    data['is_private'],
    data['payer_is_private'],
    data['is_anonymous'],
    data['is_hidden'],
    data['private'],
  ];

  return flags.some(
    (flag) => flag === true || flag === 'true' || flag === '1' || flag === 1
  );
}
