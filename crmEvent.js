const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// One tracked click on a client website — a phone link, email link, or
// social profile link. Recorded through the site's own /api/crm/events proxy
// and counted on the admin's Mailing List & Analytics cards.
const crmEventSchema = new Schema(
  {
    clientSlug: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["phone_click", "email_click", "social_click"],
      required: true,
    },
    // e.g. "instagram", "facebook" for social clicks
    label: String,
    path: String,
  },
  {
    timestamps: true,
  }
);

crmEventSchema.index({ clientSlug: 1, createdAt: -1 });

module.exports = crmEventSchema;
