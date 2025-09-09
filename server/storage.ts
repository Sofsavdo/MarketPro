import { db } from './db';
import { 
  users, 
  partners, 
  products, 
  fulfillmentRequests,
  apiKeys,
  type User,
  type Partner,
  type Product,
  type FulfillmentRequest,
  type ApiKey
} from '@shared/schema';

// Export database instance
export { db };

// Export tables for direct access
export {
  users,
  partners,
  products,
  fulfillmentRequests,
  apiKeys
};

// Export types
export type {
  User,
  Partner,
  Product,
  FulfillmentRequest,
  ApiKey
};

// Storage object with common methods
export const storage = {
  db,
  users,
  partners,
  products,
  fulfillmentRequests,
  apiKeys
};