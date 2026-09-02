const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// A subscriber is any contact captured on a client website — a contact form
// submission or a newsletter signup — scoped to the client it came from.
const crmSubscriberSchema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "CrmClient",
      required: true,
    },
    clientSlug: {
      type: String,
      required: true,
    },
    name: String,
    email: {
      type: String,
      required: true,
    },
    phone: String,
    message: String,
    source: {
      type: String,
      enum: ["contact_form", "newsletter", "import"],
      default: "contact_form",
    },
    // Rescue-specific interest checkboxes from the contact form — optional
    // per client (a client whose form doesn't ask these just never sets
    // them), shown as badges in the admin subscribers table.
    interestedAdopting: { type: Boolean, default: false },
    interestedFostering: { type: Boolean, default: false },
    interestedVolunteering: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

module.exports = crmSubscriberSchema;
