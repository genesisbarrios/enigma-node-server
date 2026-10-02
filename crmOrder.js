const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// One paid (or attempted) purchase on a client site that sells through
// ePayco payment links. Payment fields always come from ePayco's own
// validation API (never from whoever called us); fulfillment fields are set
// by the client in their admin's Orders tab.
const crmOrderSchema = new Schema(
  {
    clientSlug: { type: String, required: true, index: true },
    refPayco: { type: String, required: true },
    transactionId: String,
    invoice: String,
    // From ePayco's x_cod_response: 1 paid, 2 rejected, 3 pending, 4 failed.
    paymentStatus: {
      type: String,
      enum: ["paid", "rejected", "pending", "failed"],
      required: true,
    },
    amount: Number,
    currency: String,
    description: String,
    paymentMethod: String,
    transactionDate: String,
    testMode: Boolean,
    customer: {
      name: String,
      email: String,
      phone: String,
      address: String,
      city: String,
      country: String,
      document: String,
    },
    fulfillment: {
      type: String,
      enum: ["new", "shipped", "delivered", "cancelled"],
      default: "new",
    },
    carrier: String,
    trackingNumber: String,
    notes: String,
    shippedAt: Date,
    deliveredAt: Date,
    shippedEmailSentAt: Date,
  },
  { timestamps: true }
);

crmOrderSchema.index({ clientSlug: 1, refPayco: 1 }, { unique: true });
crmOrderSchema.index({ clientSlug: 1, createdAt: -1 });

module.exports = crmOrderSchema;
