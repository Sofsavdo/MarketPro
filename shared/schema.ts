import { pgTable, text, integer, timestamp, serial, boolean, decimal, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['admin', 'partner'] }).notNull().default('partner'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Partners table
export const partners = pgTable('partners', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  companyName: text('company_name').notNull(),
  contactPerson: text('contact_person').notNull(),
  phone: text('phone').notNull(),
  address: text('address'),
  tier: text('tier', { enum: ['basic', 'premium', 'enterprise'] }).notNull().default('basic'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Products table
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  partnerId: integer('partner_id').references(() => partners.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').notNull(),
  sku: text('sku').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal('cost_price', { precision: 10, scale: 2 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Fulfillment requests table
export const fulfillmentRequests = pgTable('fulfillment_requests', {
  id: serial('id').primaryKey(),
  partnerId: integer('partner_id').references(() => partners.id).notNull(),
  productId: integer('product_id').references(() => products.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  marketplace: text('marketplace', { enum: ['uzum', 'wildberries', 'yandex'] }).notNull(),
  urgency: text('urgency', { enum: ['low', 'medium', 'high'] }).notNull().default('medium'),
  status: text('status', { enum: ['pending', 'in_progress', 'completed', 'cancelled'] }).notNull().default('pending'),
  budget: decimal('budget', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// API keys table
export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  partnerId: integer('partner_id').references(() => partners.id).notNull(),
  marketplace: text('marketplace', { enum: ['uzum', 'wildberries', 'yandex'] }).notNull(),
  keyName: text('key_name').notNull(),
  keyValue: text('key_value').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Export Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertPartnerSchema = createInsertSchema(partners);
export const selectPartnerSchema = createSelectSchema(partners);
export const insertProductSchema = createInsertSchema(products);
export const selectProductSchema = createSelectSchema(products);
export const insertFulfillmentRequestSchema = createInsertSchema(fulfillmentRequests);
export const selectFulfillmentRequestSchema = createSelectSchema(fulfillmentRequests);
export const insertApiKeySchema = createInsertSchema(apiKeys);
export const selectApiKeySchema = createSelectSchema(apiKeys);

// Types
export type User = z.infer<typeof selectUserSchema>;
export type Partner = z.infer<typeof selectPartnerSchema>;
export type Product = z.infer<typeof selectProductSchema>;
export type FulfillmentRequest = z.infer<typeof selectFulfillmentRequestSchema>;
export type ApiKey = z.infer<typeof selectApiKeySchema>;