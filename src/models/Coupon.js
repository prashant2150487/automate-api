const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  discountType: { type: String, enum: ['flat', 'percentage'], required: true },
  amount: { type: Number, required: true },
  assignedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  validUntil: { type: Date, required: true }
});

export const Coupon = mongoose.model('Coupon', couponSchema);
