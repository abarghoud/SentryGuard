import { NoulQuestion, TypeSafeClient, noul } from '@typesafe-ai/sdk';
import { INGESTION_JUDGMENT_REQUEST_OPTIONS } from '../../config/typesafe-judgment.config';
import { getTypeSafeClient } from '../../common/utils/typesafe-client.util';
import { logJudgment, logJudgmentFailure } from '../../common/utils/typesafe-judgment-log.util';

export type SupporterTextJudge = (text: string) => Promise<boolean>;

type SupporterModerationQuestions = {
  profanity: NoulQuestion;
  spam: NoulQuestion;
  politics: NoulQuestion;
};

enum ModerationAction {
  Block = 'block',
  LegacyFallback = 'legacy-fallback',
  Allow = 'allow',
}

function decideModerationAction(profanityProbability: number, spamProbability: number, politicsProbability = 0): ModerationAction {
  const highestProbability = Math.max(profanityProbability, spamProbability, politicsProbability);

  if (highestProbability >= MODERATION_BLOCK_THRESHOLD) {
    return ModerationAction.Block;
  }

  if (highestProbability >= MODERATION_REVIEW_THRESHOLD) {
    return ModerationAction.LegacyFallback;
  }

  return ModerationAction.Allow;
}

function buildSupporterModerationQuestions(): SupporterModerationQuestions {
  return {
    profanity: noul('Does this text contain profanity, hate speech, or sexually explicit language, including deliberately disguised spellings such as substituted characters (@ for a, 0 for o, 1 for i) or inserted punctuation?', {
      true: 'The text contains profanity, hate speech, or sexually explicit language, possibly disguised through substituted characters or inserted punctuation.',
      false: 'The text contains no profanity, hate speech, or sexually explicit language. Genuine names that merely contain similar letter sequences, such as Dickens, are not profanity.',
    }),
    spam: noul('Is this text spam, advertising, or an attempt to redirect readers to an external site or offer?', {
      true: 'The text is spam, advertising, or tries to redirect readers elsewhere.',
      false: 'The text is a genuine message with no promotional or redirect intent.',
    }),
    politics: noul('Does this text contain political content, such as references to politicians, political parties, elections, or ideological slogans?', {
      true: 'The text refers to a politician, party, election, or expresses a political slogan or position.',
      false: 'The text has no political content. Ordinary personal names without political message are not political, even if shared with a public figure.',
    }),
  };
}

const SPAM_OR_LINK_REGEX =
  /(https?:\/\/|www\.|t\.me\/|discord\.gg\/|0x[a-fA-F0-9]{20,}|\.(com|org|net|io|xyz|ru|cn|top|app|dev|link|me|vip)\b)/i;

const LEGACY_SUBSTRING_PROFANITIES = [
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
  'bitch',
  'whore',
  'cunt',
  'fuck',
];

const LEGACY_WHOLE_WORD_PROFANITIES = ['dick'];

const GENERIC_NAMES = ['someone', 'anonymous', 'anonyme', 'supporter'];
const MODERATION_REVIEW_THRESHOLD = 0.35;
const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const LEETSPEAK_SUBSTITUTIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/[@4]/g, 'a'],
  [/[3]/g, 'e'],
  [/[1]/g, 'i'],
  [/[0]/g, 'o'],
  [/[5$]/g, 's'],
  [/[7]/g, 't'],
];
const MODERATION_BLOCK_THRESHOLD = 0.7;

const LEGACY_WHOLE_WORD_PATTERNS = [...LEGACY_SUBSTRING_PROFANITIES, ...LEGACY_WHOLE_WORD_PROFANITIES].map(
  (word) => new RegExp(`(?:^|[^a-z])${normalizeForMatching(word)}(?:[^a-z]|$)`)
);

async function judgeSupporterTextWithBlocklist(text: string): Promise<boolean> {
  return matchesLegacyBlocklist(text);
}

export async function judgeSupporterTextWithTypeSafe(text: string): Promise<boolean> {
  const client = getTypeSafeClient();

  if (!client) {
    return matchesLegacyBlocklist(text);
  }

  const startedAt = Date.now();

  try {
    return await askModerationBattery(client, text);
  } catch (requestError) {
    logJudgmentFailure('supporter-moderation', Date.now() - startedAt, requestError);

    return matchesLegacyBlocklist(text);
  }
}

async function askModerationBattery(client: TypeSafeClient, text: string): Promise<boolean> {
  const startedAt = Date.now();
  const result = await client.systemOne({
    state: text,
    questions: buildSupporterModerationQuestions(),
  }, INGESTION_JUDGMENT_REQUEST_OPTIONS);
  const { profanity, spam, politics } = result.answers;
  const action = decideModerationAction(profanity.noul, spam.noul, politics.noul);

  logJudgment({
    path: 'supporter-moderation',
    outcome: action,
    accepted: action !== ModerationAction.LegacyFallback,
    durationMs: Date.now() - startedAt,
    model: result.model,
    inputTokens: result.usage.input_tokens,
    outputTokens: result.usage.output_tokens,
    scores: { profanity: profanity.noul, spam: spam.noul, politics: politics.noul },
  });

  if (action === ModerationAction.Allow) {
    return false;
  }

  if (action === ModerationAction.Block) {
    return true;
  }

  return matchesLegacyBlocklist(text);
}

function normalizeLeetspeak(text: string): string {
  return LEETSPEAK_SUBSTITUTIONS.reduce(
    (normalized, [pattern, replacement]) => normalized.replace(pattern, replacement),
    text
  );
}

function normalizeForMatching(text: string): string {
  const denormalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return normalizeLeetspeak(denormalized);
}

function matchesWholeWordBlocklist(text: string): boolean {
  const normalized = normalizeForMatching(text);

  return LEGACY_WHOLE_WORD_PATTERNS.some((pattern) => pattern.test(normalized));
}

function matchesLegacyBlocklist(text: string): boolean {
  const normalized = normalizeForMatching(text);

  if (LEGACY_SUBSTRING_PROFANITIES.some((word) => normalized.includes(word))) {
    return true;
  }

  return LEGACY_WHOLE_WORD_PATTERNS.some((pattern) => pattern.test(normalized));
}

async function isProfaneOrSpam(text: string, judge: SupporterTextJudge = judgeSupporterTextWithBlocklist): Promise<boolean> {
  if (!text) {
    return false;
  }

  if (SPAM_OR_LINK_REGEX.test(text)) {
    return true;
  }

  if (matchesWholeWordBlocklist(text)) {
    return true;
  }

  try {
    return await judge(text);
  } catch {
    return matchesLegacyBlocklist(text);
  }
}

export async function sanitizeName(rawName?: string | null, isPrivate = false, judge: SupporterTextJudge = judgeSupporterTextWithBlocklist): Promise<string> {
  if (isPrivate || !rawName) {
    return 'Anonyme';
  }

  const trimmed = rawName.replace(/^["']|["']$/g, '').trim();

  if (!trimmed || EMAIL_PATTERN.test(trimmed) || GENERIC_NAMES.includes(trimmed.toLowerCase())) {
    return 'Anonyme';
  }

  if (await isProfaneOrSpam(trimmed, judge)) {
    return 'Anonyme';
  }

  return trimmed.length > 30 ? `${trimmed.slice(0, 27)}...` : trimmed;
}

export async function sanitizeMessage(rawMessage?: string | null, isPrivate = false, judge: SupporterTextJudge = judgeSupporterTextWithBlocklist): Promise<string | undefined> {
  if (isPrivate || !rawMessage) {
    return undefined;
  }

  const trimmed = rawMessage.replace(/^["']|["']$/g, '').trim();

  if (!trimmed || (await isProfaneOrSpam(trimmed, judge))) {
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
