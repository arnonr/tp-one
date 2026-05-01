import { pgEnum } from 'drizzle-orm/pg-core';

export const planItemStatusEnum = pgEnum('plan_item_status', [
  'pending',
  'in_progress',
  'completed',
  'cancelled',
]);
