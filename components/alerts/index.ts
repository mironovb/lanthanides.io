/**
 * Notification signup. The alerts layer surfaces (Prompt 22): the live Telegram
 * subscribe column, the email-waitlist form island, and the pure helpers shared
 * with the `/api/subscribe` write path. Import from `@/components/alerts`.
 */
export { TelegramSubscribe } from './TelegramSubscribe';
export { EmailWaitlistForm } from './EmailWaitlistForm';
export {
  CHANNELS,
  DEFAULT_CHANNEL,
  TOPICS,
  TOPIC_IDS,
  LIMITS,
  EMPTY_SUBSCRIPTION_VALUES,
  isValidEmail,
  normalizeEmail,
  parseTopics,
  serializeTopics,
  validateSubscription,
  toSubscriptionDTO,
} from './alerts';
export type {
  Channel,
  Topic,
  SubscriptionValues,
  SubscriptionField,
  SubscriptionClean,
  SubscriptionValidation,
  SubscriptionDTO,
  SubscriptionRow,
  CreateSubscriptionResponse,
} from './alerts';
