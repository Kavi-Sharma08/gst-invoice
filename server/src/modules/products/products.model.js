import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Product or service name is required'],
      trim: true,
      maxlength: 200
    },
    type: {
      type: String,
      enum: ['Product', 'Service'],
      default: 'Service'
    },
    hsnSac: {
      type: String,
      trim: true,
      default: ''
    },
    gstRate: {
      type: Number,
      required: true,
      default: 18,
      min: 0,
      max: 100
    },
    rate: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    unit: {
      type: String,
      trim: true,
      default: 'Nos'
    },
    description: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.userId = ret.userId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

productSchema.index({ userId: 1, name: 1 });

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
