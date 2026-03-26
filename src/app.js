import express from 'express';
import initLoaders from './loaders/index.js';
 
import './listeners/inventory.listener.js';
import './listeners/ledger.listener.js';
import './listeners/reference.listener.js';
import './listeners/customer.listener.js';
import './listeners/email.listener.js';
import './listeners/payment.listener.js';
 
/**
 * Create Express Application
 */
const createApp = async () => {
  const app = express();

  // Initialize all loaders (database, express config, etc.)
  await initLoaders(app);

  return app;
};

export default createApp;
