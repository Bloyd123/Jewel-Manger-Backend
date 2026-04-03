// FILE: src/api/organization/organization.routes.js

import express from 'express';
import * as orgController from './organization.controller.js';
import * as orgValidation from './organization.validation.js';
import { authenticate } from '../middlewares/auth.js';
import { restrictTo } from '../middlewares/restrictTo.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Sab routes ke liye authentication required
router.use(authenticate);

// ─────────────────────────────────────────────
// ONBOARD SOLO JEWELLER
// POST /api/organizations/onboard
// Super admin solo jeweller ko onboard karta hai
// Ek request mein: Org + Shop + User sab ban jata hai
// ─────────────────────────────────────────────
router.post(
  '/onboard',
  rateLimiter({ max: 10, windowMs: 60 * 60 * 1000 }), // 10 per hour
  orgValidation.onboardSoloJewellerValidation,
  restrictTo('super_admin'),
  orgController.onboardSoloJeweller
);

// ─────────────────────────────────────────────
// CREATE ORGANIZATION
// POST /api/organizations
// Only super_admin
// ─────────────────────────────────────────────
router.post(
  '/',
  rateLimiter({ max: 20, windowMs: 60 * 60 * 1000 }),
  orgValidation.createOrganizationValidation,
  restrictTo('super_admin'),
  orgController.createOrganization
);

// ─────────────────────────────────────────────
// GET ALL ORGANIZATIONS
// GET /api/organizations
// Only super_admin
// ─────────────────────────────────────────────
router.get(
  '/',
  orgValidation.getOrganizationsValidation,
  restrictTo('super_admin'),
  orgController.getAllOrganizations
);

// ─────────────────────────────────────────────
// GET SINGLE ORGANIZATION
// GET /api/organizations/:id
// super_admin → any org
// org_admin → sirf apni org
// ─────────────────────────────────────────────
router.get(
  '/:id',
  restrictTo('super_admin', 'org_admin'),
  orgController.getOrganizationById
);

// ─────────────────────────────────────────────
// UPDATE ORGANIZATION
// PUT /api/organizations/:id
// super_admin → any org
// org_admin → sirf apni org
// ─────────────────────────────────────────────
router.put(
  '/:id',
  orgValidation.updateOrganizationValidation,
  restrictTo('super_admin', 'org_admin'),
  orgController.updateOrganization
);

// ─────────────────────────────────────────────
// DELETE ORGANIZATION
// DELETE /api/organizations/:id
// Only super_admin
// ─────────────────────────────────────────────
router.delete(
  '/:id',
  restrictTo('super_admin'),
  orgController.deleteOrganization
);

// ─────────────────────────────────────────────
// GET ORGANIZATION SHOPS
// GET /api/organizations/:id/shops
// super_admin → any org
// org_admin → sirf apni org
// ─────────────────────────────────────────────
router.get(
  '/:id/shops',
  restrictTo('super_admin', 'org_admin'),
  orgController.getOrganizationShops
);

// ─────────────────────────────────────────────
// GET ORGANIZATION STATS
// GET /api/organizations/:id/stats
// super_admin → any org
// org_admin → sirf apni org
// ─────────────────────────────────────────────
router.get(
  '/:id/stats',
  restrictTo('super_admin', 'org_admin'),
  orgController.getOrganizationStats
);

// ─────────────────────────────────────────────
// UPDATE SUBSCRIPTION
// PATCH /api/organizations/:id/subscription
// Only super_admin — plan, trial, limits sab yahan se
// ─────────────────────────────────────────────
router.patch(
  '/:id/subscription',
  orgValidation.updateSubscriptionValidation,
  restrictTo('super_admin'),
  orgController.updateSubscription
);

export default router;