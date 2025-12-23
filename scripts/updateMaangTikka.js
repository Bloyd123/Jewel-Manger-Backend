// scripts/updateMaangTikka.js
import mongoose from 'mongoose';
import Category from '../src/models/Category.js';
import dotenv from 'dotenv';

dotenv.config();

const maangTikkaSubCategories = [
  {
    code: 'TRADITIONAL_MAANG_TIKKA',
    name: { default: 'Traditional Maang Tikka', localized: { hi: 'पारंपरिक मांग टीका' } }
  },
  {
    code: 'MODERN_MAANG_TIKKA',
    name: { default: 'Modern Maang Tikka', localized: { hi: 'आधुनिक मांग टीका' } }
  },
  {
    code: 'BRIDAL_MAANG_TIKKA',
    name: { default: 'Bridal Maang Tikka', localized: { hi: 'दुल्हन का मांग टीका' } }
  }
];

const run = async () => {
  try {
    console.log('🔄 Updating Maang Tikka categories...');

    await mongoose.connect(process.env.MONGODB_URI);

    const parent = await Category.findOneAndUpdate(
      { code: 'MAANG_TIKKA' },
      {
        $set: {
          name: {
            default: 'Maang Tikka',
            localized: { hi: 'मांग टीका' }
          },
          isActive: true
        }
      },
      { upsert: true, new: true }
    );

    for (const sub of maangTikkaSubCategories) {
      await Category.updateOne(
        { code: sub.code },
        {
          $set: {
            ...sub,
            parentId: parent._id,
            isActive: true
          }
        },
        { upsert: true }
      );
    }

    console.log('✅ Maang Tikka updated successfully');
    await mongoose.disconnect();
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

await run();
