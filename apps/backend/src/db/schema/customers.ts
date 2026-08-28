import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { relations } from 'drizzle-orm';
import { reservations } from './reservations.js';

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  phone: text('phone').notNull().unique(),
  email: text('email'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const customersRelations = relations(customers, ({ many }) => ({
  reservations: many(reservations),
}));
