import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema(
  {
    cartItemId: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['flight', 'hotel'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      default: '',
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
  },
  { _id: false }
);

const customerSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true, default: '' },
    lastName: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    country: { type: String, trim: true, default: '' },
    zipCode: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['in-progress', 'delivered'],
      default: 'in-progress',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    paymentMode: {
      type: String,
      enum: ['hotel', 'online'],
      required: true,
    },
    paymentReference: {
      type: String,
      trim: true,
      default: '',
    },
    items: {
      type: [purchaseItemSchema],
      default: [],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'Une commande doit contenir au moins un article.',
      },
    },
    customer: {
      type: customerSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

export const Purchase = mongoose.model('Purchase', purchaseSchema);
