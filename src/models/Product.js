import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  sku: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  category: { type: String, enum: ['Electronics', 'Fashion', 'Home', 'Beauty'], required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Product = mongoose.model('Product', productSchema);