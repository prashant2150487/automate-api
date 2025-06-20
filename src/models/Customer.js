import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
  email: { type: String, required: true },
  totalSpent: { type: Number, default: 0 },
  isNew: { type: Boolean, default: true },
  walletBalance: { type: Number, default: 0 },
});
const Customer = mongoose.model('Customer', customerSchema);