/**
 * Waitlist Cron Configuration
 *
 * Centralized configuration for waitlist email scheduler cron job.
 *
 * Configuration via environment variable:
 * - WAITLIST_EMAIL_CRON_EXPRESSION: Cron expression for email scheduler
 *
 * Default: Every hour
 *
 * See .env.example for common cron expression examples
 */

const DEFAULT_WAITLIST_EMAIL_CRON_EXPRESSION = '0 0 * * * *';

export const WAITLIST_EMAIL_CRON_EXPRESSION =
  process.env.WAITLIST_EMAIL_CRON_EXPRESSION ??
  DEFAULT_WAITLIST_EMAIL_CRON_EXPRESSION;