import mongoose from 'mongoose';
import UserShopAccess from '../src/models/UserShopAccess.js';
import dotenv from 'dotenv';
dotenv.config();

const GIRVI_PERMISSIONS_BY_ROLE = {
  shop_admin: {
    canCreateGirvi:             true,
    canViewGirvi:               true,
    canUpdateGirvi:             true,
    canDeleteGirvi:             true,
    canReleaseGirvi:            true,
    canTransferGirvi:           true,
    canReturnGirviTransfer:     true,
    canCancelGirviTransfer:     true,
    canAddGirviPayment:         true,
    canDeleteGirviPayment:      true,
    canManageGirvi:             true,
    canViewGirviCashbook:       true,
    canCreateGirviCashbookEntry: true,
    canDeleteGirviCashbookEntry: true,
  },
  manager: {
    canCreateGirvi:             true,
    canViewGirvi:               true,
    canUpdateGirvi:             true,
    canDeleteGirvi:             false,
    canReleaseGirvi:            true,
    canTransferGirvi:           true,
    canReturnGirviTransfer:     true,
    canCancelGirviTransfer:     false,
    canAddGirviPayment:         true,
    canDeleteGirviPayment:      false,
    canManageGirvi:             true,
    canViewGirviCashbook:       true,
    canCreateGirviCashbookEntry: true,
    canDeleteGirviCashbookEntry: false,
  },
  staff: {
    canCreateGirvi:             true,
    canViewGirvi:               true,
    canUpdateGirvi:             false,
    canDeleteGirvi:             false,
    canReleaseGirvi:            false,
    canTransferGirvi:           false,
    canReturnGirviTransfer:     false,
    canCancelGirviTransfer:     false,
    canAddGirviPayment:         true,
    canDeleteGirviPayment:      false,
    canManageGirvi:             false,
    canViewGirviCashbook:       false,
    canCreateGirviCashbookEntry: false,
    canDeleteGirviCashbookEntry: false,
  },
  accountant: {
    canCreateGirvi:             false,
    canViewGirvi:               true,
    canUpdateGirvi:             false,
    canDeleteGirvi:             false,
    canReleaseGirvi:            false,
    canTransferGirvi:           false,
    canReturnGirviTransfer:     false,
    canCancelGirviTransfer:     false,
    canAddGirviPayment:         false,
    canDeleteGirviPayment:      false,
    canManageGirvi:             false,
    canViewGirviCashbook:       true,
    canCreateGirviCashbookEntry: false,
    canDeleteGirviCashbookEntry: false,
  },
  viewer: {
    canCreateGirvi:             false,
    canViewGirvi:               false,
    canUpdateGirvi:             false,
    canDeleteGirvi:             false,
    canReleaseGirvi:            false,
    canTransferGirvi:           false,
    canReturnGirviTransfer:     false,
    canCancelGirviTransfer:     false,
    canAddGirviPayment:         false,
    canDeleteGirviPayment:      false,
    canManageGirvi:             false,
    canViewGirviCashbook:       false,
    canCreateGirviCashbookEntry: false,
    canDeleteGirviCashbookEntry: false,
  },
};

// super_admin aur org_admin ko saari permissions true
const SUPER_ROLES = ['super_admin', 'org_admin'];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const allDocs = await UserShopAccess.find({}).lean();
  console.log(`Total UserShopAccess documents: ${allDocs.length}`);

  let updated = 0;
  let skipped = 0;

  for (const doc of allDocs) {
    const role = doc.role;

    // Determine girvi permissions for this role
    let girviPerms;

    if (SUPER_ROLES.includes(role)) {
      // super_admin / org_admin → all true
      girviPerms = Object.fromEntries(
        Object.keys(GIRVI_PERMISSIONS_BY_ROLE.shop_admin).map(k => [k, true])
      );
    } else if (GIRVI_PERMISSIONS_BY_ROLE[role]) {
      girviPerms = GIRVI_PERMISSIONS_BY_ROLE[role];
    } else {
      // Unknown role → all false
      girviPerms = Object.fromEntries(
        Object.keys(GIRVI_PERMISSIONS_BY_ROLE.viewer).map(k => [k, false])
      );
    }

    // Build $set object
    const setObj = {};
    for (const [key, value] of Object.entries(girviPerms)) {
      setObj[`permissions.${key}`] = value;
    }

    await UserShopAccess.updateOne(
      { _id: doc._id },
      { $set: setObj }
    );

    updated++;
    console.log(`✅ Updated: ${doc._id} (role: ${role})`);
  }

  console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`);
  await mongoose.disconnect();
};

run().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});