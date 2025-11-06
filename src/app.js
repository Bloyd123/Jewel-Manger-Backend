import express from 'express';
import initLoaders from './loaders/index.js';

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