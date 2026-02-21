/**
 * Waitlist Cron Configuration
 *
 * Centralized configuration for waitlist email scheduler cron job.
 *
 * Configuration via environment variables:
 * - WAITLIST_EMAIL_CRON_EXPRESSION: Cron expression for email scheduler
 * - WAITLIST_EMAIL_BATCH_SIZE: Number of approved users to process per cron run
 *
 * See .env.example for common cron expression examples
 */

const DEFAULT_WAITLIST_EMAIL_CRON_EXPRESSION = '0 0 * * * *';
const DEFAULT_WAITLIST_EMAIL_BATCH_SIZE = 20;

export const WAITLIST_EMAIL_CRON_EXPRESSION =
  process.env.WAITLIST_EMAIL_CRON_EXPRESSION ??
  DEFAULT_WAITLIST_EMAIL_CRON_EXPRESSION;

export const WAITLIST_EMAIL_BATCH_SIZE = process.env.WAITLIST_EMAIL_BATCH_SIZE
  ? parseInt(process.env.WAITLIST_EMAIL_BATCH_SIZE, 10)
  : DEFAULT_WAITLIST_EMAIL_BATCH_SIZE;

export const waitlistEmailBatchSizeToken = Symbol('WAITLIST_EMAIL_BATCH_SIZE');