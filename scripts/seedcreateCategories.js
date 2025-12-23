import mongoose from 'mongoose'
import Category from '../src/models/Category.js'
import dotenv from 'dotenv'

dotenv.config()

// ============================================
// BROOCH / PIN CATEGORY DATA
// ============================================

const BROOCH_CATEGORY = {
  code: 'BROOCH',
  name: {
    default: 'Brooch / Pin',
    localized: { hi: 'ब्रोच / पिन' },
  },
  isActive: true,
}

const BROOCH_SUBCATEGORIES = [
  {
    code: 'BRIDAL_BROOCH',
    name: { default: 'Bridal Brooch', localized: { hi: 'दुल्हन ब्रोच' } },
  },
  {
    code: 'SAREE_PIN',
    name: { default: 'Saree Pin', localized: { hi: 'साड़ी पिन' } },
  },
  {
    code: 'SHERWANI_BROOCH',
    name: { default: 'Sherwani Brooch', localized: { hi: 'शेरवानी ब्रोच' } },
  },
  {
    code: 'DUPATTA_PIN',
    name: { default: 'Dupatta Pin', localized: { hi: 'दुपट्टा पिन' } },
  },
  {
    code: 'DESIGNER_BROOCH',
    name: { default: 'Designer Brooch', localized: { hi: 'डिज़ाइनर ब्रोच' } },
  },
]

// ============================================
// SEED FUNCTION (ADD ONLY)
// ============================================

const seedBroochCategory = async () => {
  try {
    console.log('🔄 Seeding BROOCH / PIN category (safe mode)...')

    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ MongoDB connected')

    // 1️⃣ Check if main category exists
    let broochCategory = await Category.findOne({ code: 'BROOCH' })

    if (!broochCategory) {
      broochCategory = await Category.create(BROOCH_CATEGORY)
      console.log('✅ BROOCH main category added')
    } else {
      console.log('ℹ️  BROOCH category already exists — skipping')
    }

    // 2️⃣ Add subcategories safely
    for (const sub of BROOCH_SUBCATEGORIES) {
      const exists = await Category.findOne({ code: sub.code })

      if (!exists) {
        await Category.create({
          ...sub,
          parentId: broochCategory._id,
          isActive: true,
        })
        console.log(`✅ Added subcategory: ${sub.code}`)
      } else {
        console.log(`ℹ️  Subcategory ${sub.code} already exists — skipping`)
      }
    }

    console.log('\n🎉 BROOCH / PIN seeding completed successfully')

    await mongoose.disconnect()
    console.log('✅ MongoDB disconnected')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

// Run directly
await seedBroochCategory()
process.exit(0)
