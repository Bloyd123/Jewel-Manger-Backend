import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    parentId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Category',
      default: null,
      index: true 
    },
    code: { 
      type: String, 
      required: true, 
      uppercase: true,
      unique: true,
      index: true 
    },
    name: {
      default: { type: String, required: true },
      localized: { type: Map, of: String }
    },
    isActive: { type: Boolean, default: true, index: true } 
  },
  {
    timestamps: true 
  }
);

// ✅ ADD COMPOUND INDEX
categorySchema.index({ parentId: 1, code: 1 });

export default mongoose.model('Category', categorySchema);