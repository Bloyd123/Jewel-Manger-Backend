import mongoose from 'mongoose';
import Category from '../src/models/Category.js';
import dotenv from 'dotenv';

dotenv.config();

// ============================================
// MAIN CATEGORIES (parentId: null)
// ============================================
const mainCategories = [
  {
    code: 'RING',
    name: {
      default: 'Ring',
      localized: { hi: 'अंगूठी' }
    },
    isActive: true
  },
  {
    code: 'NECKLACE',
    name: {
      default: 'Necklace',
      localized: { hi: 'हार' }
    },
    isActive: true
  },
  {
    code: 'EARRING',
    name: {
      default: 'Earring',
      localized: { hi: 'कान की बाली' }
    },
    isActive: true
  },
  {
    code: 'BRACELET',
    name: {
      default: 'Bracelet',
      localized: { hi: 'कंगन' }
    },
    isActive: true
  },
  {
    code: 'BANGLE',
    name: {
      default: 'Bangle',
      localized: { hi: 'चूड़ी' }
    },
    isActive: true
  },
  {
    code: 'PENDANT',
    name: {
      default: 'Pendant',
      localized: { hi: 'लॉकेट' }
    },
    isActive: true
  },
  {
    code: 'CHAIN',
    name: {
      default: 'Chain',
      localized: { hi: 'चेन' }
    },
    isActive: true
  },
  {
    code: 'MANGALSUTRA',
    name: {
      default: 'Mangalsutra',
      localized: { hi: 'मंगलसूत्र' }
    },
    isActive: true
  },
  {
    code: 'NOSE_PIN',
    name: {
      default: 'Nose Pin',
      localized: { hi: 'नथ' }
    },
    isActive: true
  },
  {
    code: 'ANKLET',
    name: {
      default: 'Anklet',
      localized: { hi: 'पायल' }
    },
    isActive: true
  },
  {
    code: 'COIN',
    name: {
      default: 'Coin',
      localized: { hi: 'सिक्का' }
    },
    isActive: true
  },
  {
    code: 'BAR',
    name: {
      default: 'Bar',
      localized: { hi: 'बार' }
    },
    isActive: true
  },
  {
    code: 'BISCUIT',
    name: {
      default: 'Biscuit',
      localized: { hi: 'बिस्कुट' }
    },
    isActive: true
  },
  {
    code: 'MAANG_TIKKA',
    name: {
      default: 'Maang Tikka',
      localized: { hi: 'मांग टीका' }
    },
    isActive: true
  },
  {
    code: 'WAIST_BELT',
    name: {
      default: 'Waist Belt (Kamarband)',
      localized: { hi: 'कमरबंद' }
    },
    isActive: true
  },
  {
    code: 'FINGER_RING',
    name: {
      default: 'Finger Ring (Bichhiya)',
      localized: { hi: 'बिछिया' }
    },
    isActive: true
  },
  {
    code: 'ARMLET',
    name: {
      default: 'Armlet (Bajuband)',
      localized: { hi: 'बाजूबंद' }
    },
    isActive: true
  },
  {
    code: 'OTHER',
    name: {
      default: 'Other',
      localized: { hi: 'अन्य' }
    },
    isActive: true
  }
];

// ============================================
// SUBCATEGORIES (mapped to parentId)
// ============================================
const subCategories = {
  RING: [
    { code: 'ENGAGEMENT_RING', name: { default: 'Engagement Ring', localized: { hi: 'एंगेजमेंट रिंग' } } },
    { code: 'WEDDING_RING', name: { default: 'Wedding Ring', localized: { hi: 'वेडिंग रिंग' } } },
    { code: 'COCKTAIL_RING', name: { default: 'Cocktail Ring', localized: { hi: 'कॉकटेल रिंग' } } },
    { code: 'SOLITAIRE_RING', name: { default: 'Solitaire Ring', localized: { hi: 'सॉलिटेयर रिंग' } } },
    { code: 'BAND_RING', name: { default: 'Band Ring', localized: { hi: 'बैंड रिंग' } } },
    { code: 'DAILY_WEAR_RING', name: { default: 'Daily Wear Ring', localized: { hi: 'रोज़ पहनने की अंगूठी' } } },
    { code: 'ADJUSTABLE_RING', name: { default: 'Adjustable Ring', localized: { hi: 'एडजस्टेबल रिंग' } } }
  ],
  NECKLACE: [
    { code: 'CHOKER', name: { default: 'Choker', localized: { hi: 'चोकर' } } },
    { code: 'LONG_NECKLACE', name: { default: 'Long Necklace', localized: { hi: 'लम्बा हार' } } },
    { code: 'SHORT_NECKLACE', name: { default: 'Short Necklace', localized: { hi: 'छोटा हार' } } },
    { code: 'RANI_HAAR', name: { default: 'Rani Haar', localized: { hi: 'रानी हार' } } },
    { code: 'LAYERED_NECKLACE', name: { default: 'Layered Necklace', localized: { hi: 'लेयर्ड हार' } } },
    { code: 'PEARL_NECKLACE', name: { default: 'Pearl Necklace', localized: { hi: 'मोती का हार' } } },
    { code: 'KUNDAN_NECKLACE', name: { default: 'Kundan Necklace', localized: { hi: 'कुंदन हार' } } },
    { code: 'TEMPLE_NECKLACE', name: { default: 'Temple Necklace', localized: { hi: 'टेम्पल हार' } } }
  ],
  EARRING: [
    { code: 'STUD_EARRING', name: { default: 'Stud Earring', localized: { hi: 'स्टड इयररिंग' } } },
    { code: 'HOOP_EARRING', name: { default: 'Hoop Earring', localized: { hi: 'हूप इयररिंग' } } },
    { code: 'DROP_EARRING', name: { default: 'Drop Earring', localized: { hi: 'ड्रॉप इयररिंग' } } },
    { code: 'JHUMKA', name: { default: 'Jhumka', localized: { hi: 'झुमका' } } },
    { code: 'CHANDBALI', name: { default: 'Chandbali', localized: { hi: 'चाँदबाली' } } },
    { code: 'DANGLERS', name: { default: 'Danglers', localized: { hi: 'डेंगलर' } } },
    { code: 'TOPS', name: { default: 'Tops', localized: { hi: 'टॉप्स' } } },
    { code: 'EAR_CUFF', name: { default: 'Ear Cuff', localized: { hi: 'इयर कफ' } } }
  ],
  BRACELET: [
    { code: 'CHAIN_BRACELET', name: { default: 'Chain Bracelet', localized: { hi: 'चेन ब्रेसलेट' } } },
    { code: 'BEAD_BRACELET', name: { default: 'Bead Bracelet', localized: { hi: 'बीड ब्रेसलेट' } } },
    { code: 'CHARM_BRACELET', name: { default: 'Charm Bracelet', localized: { hi: 'चार्म ब्रेसलेट' } } },
    { code: 'KADA', name: { default: 'Kada', localized: { hi: 'कड़ा' } } },
    { code: 'TENNIS_BRACELET', name: { default: 'Tennis Bracelet', localized: { hi: 'टेनिस ब्रेसलेट' } } }
  ],
  BANGLE: [
    { code: 'PLAIN_BANGLE', name: { default: 'Plain Bangle', localized: { hi: 'सादी चूड़ी' } } },
    { code: 'DESIGNER_BANGLE', name: { default: 'Designer Bangle', localized: { hi: 'डिज़ाइनर चूड़ी' } } },
    { code: 'KUNDAN_BANGLE', name: { default: 'Kundan Bangle', localized: { hi: 'कुंदन चूड़ी' } } },
    { code: 'MEENAKARI_BANGLE', name: { default: 'Meenakari Bangle', localized: { hi: 'मीनाकारी चूड़ी' } } },
    { code: 'KANGAN', name: { default: 'Kangan', localized: { hi: 'कंगन' } } },
    { code: 'OPENABLE_BANGLE', name: { default: 'Openable Bangle', localized: { hi: 'खुलने वाली चूड़ी' } } }
  ],
  PENDANT: [
    { code: 'SOLITAIRE_PENDANT', name: { default: 'Solitaire Pendant', localized: { hi: 'सॉलिटेयर लॉकेट' } } },
    { code: 'RELIGIOUS_PENDANT', name: { default: 'Religious Pendant', localized: { hi: 'धार्मिक लॉकेट' } } },
    { code: 'INITIAL_PENDANT', name: { default: 'Initial Pendant', localized: { hi: 'इनिशियल लॉकेट' } } },
    { code: 'HEART_PENDANT', name: { default: 'Heart Pendant', localized: { hi: 'हार्ट लॉकेट' } } },
    { code: 'EVIL_EYE_PENDANT', name: { default: 'Evil Eye Pendant', localized: { hi: 'नज़र बट्टू लॉकेट' } } },
    { code: 'ZODIAC_PENDANT', name: { default: 'Zodiac Pendant', localized: { hi: 'राशि लॉकेट' } } }
  ],
  CHAIN: [
    { code: 'ROPE_CHAIN', name: { default: 'Rope Chain', localized: { hi: 'रोप चेन' } } },
    { code: 'BOX_CHAIN', name: { default: 'Box Chain', localized: { hi: 'बॉक्स चेन' } } },
    { code: 'CABLE_CHAIN', name: { default: 'Cable Chain', localized: { hi: 'केबल चेन' } } },
    { code: 'FIGARO_CHAIN', name: { default: 'Figaro Chain', localized: { hi: 'फिगारो चेन' } } },
    { code: 'CURB_CHAIN', name: { default: 'Curb Chain', localized: { hi: 'कर्ब चेन' } } },
    { code: 'SNAKE_CHAIN', name: { default: 'Snake Chain', localized: { hi: 'स्नेक चेन' } } }
  ],
  MANGALSUTRA: [
    { code: 'TRADITIONAL_MANGALSUTRA', name: { default: 'Traditional Mangalsutra', localized: { hi: 'पारंपरिक मंगलसूत्र' } } },
    { code: 'MODERN_MANGALSUTRA', name: { default: 'Modern Mangalsutra', localized: { hi: 'आधुनिक मंगलसूत्र' } } },
    { code: 'SHORT_MANGALSUTRA', name: { default: 'Short Mangalsutra', localized: { hi: 'छोटा मंगलसूत्र' } } },
    { code: 'LONG_MANGALSUTRA', name: { default: 'Long Mangalsutra', localized: { hi: 'लंबा मंगलसूत्र' } } },
    { code: 'DIAMOND_MANGALSUTRA', name: { default: 'Diamond Mangalsutra', localized: { hi: 'डायमंड मंगलसूत्र' } } }
  ],
  NOSE_PIN: [
    { code: 'SIMPLE_NOSE_PIN', name: { default: 'Simple Nose Pin', localized: { hi: 'सादी नथ' } } },
    { code: 'DIAMOND_NOSE_PIN', name: { default: 'Diamond Nose Pin', localized: { hi: 'डायमंड नथ' } } },
    { code: 'SCREW_NOSE_PIN', name: { default: 'Screw Nose Pin', localized: { hi: 'स्क्रू नथ' } } },
    { code: 'L_SHAPE_NOSE_PIN', name: { default: 'L-Shape Nose Pin', localized: { hi: 'एल शेप नथ' } } },
    { code: 'BRIDAL_NOSE_RING', name: { default: 'Bridal Nose Ring', localized: { hi: 'दुल्हन की नथ' } } }
  ],
  ANKLET: [
    { code: 'SIMPLE_ANKLET', name: { default: 'Simple Anklet', localized: { hi: 'सादी पायल' } } },
    { code: 'DESIGNER_ANKLET', name: { default: 'Designer Anklet', localized: { hi: 'डिज़ाइनर पायल' } } },
    { code: 'LAYERED_ANKLET', name: { default: 'Layered Anklet', localized: { hi: 'लेयर्ड पायल' } } },
    { code: 'GHUNGROO_ANKLET', name: { default: 'Ghungroo Anklet', localized: { hi: 'घुंघरू पायल' } } }
  ],
  COIN: [
    { code: 'GOLD_COIN', name: { default: 'Gold Coin', localized: { hi: 'सोने का सिक्का' } } },
    { code: 'SILVER_COIN', name: { default: 'Silver Coin', localized: { hi: 'चांदी का सिक्का' } } },
    { code: 'RELIGIOUS_COIN', name: { default: 'Religious Coin', localized: { hi: 'धार्मिक सिक्का' } } },
    { code: 'COMMEMORATIVE_COIN', name: { default: 'Commemorative Coin', localized: { hi: 'स्मारक सिक्का' } } }
  ],
  BAR: [
    { code: 'GOLD_BAR', name: { default: 'Gold Bar', localized: { hi: 'सोने की बार' } } },
    { code: 'SILVER_BAR', name: { default: 'Silver Bar', localized: { hi: 'चांदी की बार' } } },
    { code: 'PLATINUM_BAR', name: { default: 'Platinum Bar', localized: { hi: 'प्लैटिनम बार' } } }
  ],
  BISCUIT: [
    { code: 'GOLD_BISCUIT', name: { default: 'Gold Biscuit', localized: { hi: 'सोने का बिस्कुट' } } },
    { code: 'SILVER_BISCUIT', name: { default: 'Silver Biscuit', localized: { hi: 'चांदी का बिस्कुट' } } }
  ],
  MAANG_TIKKA: [
    { code: 'TRADITIONAL_MAANG_TIKKA', name: { default: 'Traditional Maang Tikka', localized: { hi: 'पारंपरिक मांग टीका' } } },
    { code: 'MODERN_MAANG_TIKKA', name: { default: 'Modern Maang Tikka', localized: { hi: 'आधुनिक मांग टीका' } } },
    { code: 'BRIDAL_MAANG_TIKKA', name: { default: 'Bridal Maang Tikka', localized: { hi: 'दुल्हन का मांग टीका' } } }
  ],
  WAIST_BELT: [
    { code: 'SIMPLE_KAMARBAND', name: { default: 'Simple Kamarband', localized: { hi: 'सादा कमरबंद' } } },
    { code: 'DESIGNER_KAMARBAND', name: { default: 'Designer Kamarband', localized: { hi: 'डिज़ाइनर कमरबंद' } } },
    { code: 'BRIDAL_KAMARBAND', name: { default: 'Bridal Kamarband', localized: { hi: 'दुल्हन का कमरबंद' } } }
  ],
  FINGER_RING: [
    { code: 'TOE_RING_SINGLE', name: { default: 'Single Toe Ring', localized: { hi: 'एकल बिछिया' } } },
    { code: 'TOE_RING_PAIR', name: { default: 'Pair Toe Ring', localized: { hi: 'जोड़ी बिछिया' } } },
    { code: 'ADJUSTABLE_TOE_RING', name: { default: 'Adjustable Toe Ring', localized: { hi: 'एडजस्टेबल बिछिया' } } }
  ],
  ARMLET: [
    { code: 'TRADITIONAL_BAJUBAND', name: { default: 'Traditional Bajuband', localized: { hi: 'पारंपरिक बाजूबंद' } } },
    { code: 'MODERN_BAJUBAND', name: { default: 'Modern Bajuband', localized: { hi: 'आधुनिक बाजूबंद' } } }
  ],
  OTHER: [
    { code: 'OTHER_MISC', name: { default: 'Miscellaneous', localized: { hi: 'विविध' } } }
  ]
};

// ============================================
// SEED FUNCTION
// ============================================
export const seedCategories = async () => {
  try {
    console.log('🔄 Starting category seeding...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // // Clear existing categories
    // await Category.deleteMany({});
    // console.log('🗑️  Cleared existing categories');

    // Insert main categories
    const insertedMainCategories = await Category.insertMany(mainCategories);
    console.log(`✅ Inserted ${insertedMainCategories.length} main categories`);

    // Create a map of code -> _id
    const categoryMap = {};
    insertedMainCategories.forEach(cat => {
      categoryMap[cat.code] = cat._id;
    });

    // Prepare subcategories with parentId
    const allSubCategories = [];
    for (const [parentCode, subs] of Object.entries(subCategories)) {
      const parentId = categoryMap[parentCode];
      if (parentId) {
        subs.forEach(sub => {
          allSubCategories.push({
            ...sub,
            parentId,
            isActive: true
          });
        });
      }
    }

    // Insert subcategories
    const insertedSubCategories = await Category.insertMany(allSubCategories);
    console.log(`✅ Inserted ${insertedSubCategories.length} subcategories`);

    // Print OTHER category IDs for .env
    const otherCategory = insertedMainCategories.find(c => c.code === 'OTHER');
    const otherSubCategory = insertedSubCategories.find(c => c.code === 'OTHER_MISC');

    console.log('\n📋 Add these to your .env file:');
    console.log(`OTHER_CATEGORY_ID=${otherCategory._id}`);
    console.log(`OTHER_SUBCATEGORY_ID=${otherSubCategory._id}`);

    console.log('\n✅ Category seeding completed successfully!');
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    process.exit(1);
  }
};

// Run if called directly
await seedCategories();
process.exit(0);