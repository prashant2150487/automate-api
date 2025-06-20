import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  discountType: {
    type: String,
    required: true,
    enum: {
      values: ['percentage', 'fixed', 'freeShipping'],
      message: 'Discount type must be percentage, fixed, or freeShipping'
    }
  },
  discountValue: {
    type: Number,
    required: function() {
      return this.discountType !== 'freeShipping';
    },
    min: [0, 'Discount value cannot be negative'],
    validate: {
      validator: function(value) {
        if (this.discountType === 'percentage') {
          return value <= 100;
        }
        return true;
      },
      message: 'Percentage discount cannot exceed 100%'
    }
  },
  minimumCartValue: {
    type: Number,
    min: [0, 'Minimum cart value cannot be negative']
  },
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  excludedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  categories: [{
    type: String,
    enum: ['Outdoor', 'Indoor', 'Sports', 'Furniture']
  }],
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  maxUses: {
    type: Number,
    min: [1, 'Max uses must be at least 1']
  },
  currentUses: {
    type: Number,
    default: 0,
    min: [0, 'Current uses cannot be negative']
  },
  userUses: {
    type: Number,
    default: 1,
    min: [1, 'User uses must be at least 1']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for frequently queried fields
couponSchema.index({ code: 1, isActive: 1 });
couponSchema.index({ endDate: 1 });

// Pre-save hook to uppercase coupon code
couponSchema.pre('save', function(next) {
  if (this.code) {
    this.code = this.code.toUpperCase();
  }
  next();
});

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;