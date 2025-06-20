import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  product_name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  product_category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: {
      values: ['Outdoor', 'Indoor', 'Sports', 'Furniture'],
      message: '{VALUE} is not a valid category'
    }
  },
  product_price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price must be positive']
  },
  product_description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  stock_quantity: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative']
  },
  manufacturer: {
    type: String,
    required: [true, 'Manufacturer is required'],
    trim: true
  },
  product_weight: {
    type: Number,
    required: [true, 'Product weight is required'],
    min: [0, 'Weight must be positive']
  },
  product_color: {
    type: String,
    required: [true, 'Product color is required'],
    enum: {
      values: ['red', 'blue', 'green', 'black', 'white', 'yellow'],
      message: '{VALUE} is not a supported color'
    }
  },
  product_size: {
    type: String,
    required: [true, 'Product size is required'],
    enum: {
      values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      message: '{VALUE} is not a valid size'
    }
  },
  product_material: {
    type: String,
    required: [true, 'Product material is required'],
    enum: {
      values: ['silk', 'cotton', 'polyester', 'nylon', 'wool'],
      message: '{VALUE} is not a supported material'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create text index for searching
productSchema.index({
  product_name: 'text',
  product_description: 'text',
  manufacturer: 'text'
});

const Product = mongoose.model('Product', productSchema);

export default Product;