// ============================================================================
// FILE: scripts/updateShopAccessPermissions.js
// ============================================================================

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserShopAccess from '../src/models/UserShopAccess.js';
import { getPermissionsByRole } from '../src/config/permissions.config.js';

dotenv.config();

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(' Connected to MongoDB');
  } catch (error) {
    console.error(' MongoDB connection error:', error);
    process.exit(1);
  }
}

async function updateAllPermissions() {
  try {
    console.log('\nStarting permission migration...\n');

    const roles = ['shop_admin', 'manager', 'staff', 'accountant', 'viewer'];
    let totalUpdated = 0;

    for (const role of roles) {
      console.log(`\nProcessing role: ${role.toUpperCase()}`);

      const accessRecords = await UserShopAccess.find({
        role,
        deletedAt: null,
        revokedAt: null,
      });

      console.log(`   Found: ${accessRecords.length} records`);

      if (accessRecords.length === 0) continue;

      const defaultPermissions = getPermissionsByRole(role);

      for (const access of accessRecords) {
        access.permissions = {
          ...defaultPermissions,
          ...access.permissions.toObject(),
        };
        await access.save();
        totalUpdated++;
        console.log(`     Updated: User ${access.userId}`);
      }
    }

    console.log(`\n  Total updated: ${totalUpdated} records\n`);
  } catch (error) {
    console.error('\n  Migration failed:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Migration...');
    await connectDB();
    await updateAllPermissions();
    console.log('  Migration completed!\n');
    process.exit(0);
  } catch (error) {
    console.error('  Error:', error);
    process.exit(1);
  }
}

main();
