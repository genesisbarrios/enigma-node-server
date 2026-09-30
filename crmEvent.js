const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// One tracked event on a client website — a page view, or a click on a
// phone, email, or social profile link. Recorded through the site's own
// /api/crm/events proxy and counted on the admin's Site Activity cards.
const crmEventSchema = new Schema(
  {
    clientSlug: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["page_view", "phone_click", "email_click", "social_click"],
      required: true,
    },
    // e.g. "instagram", "facebook" for social clicks
    label: String,
    path: String,
    // Anonymous random ID the site keeps in the visitor's localStorage — only
    // used to count unique visitors, never tied to a person.
    visitorId: String,
  },
  {
    timestamps: true,
  }
);

crmEventSchema.index({ clientSlug: 1, createdAt: -1 });

module.exports = crmEventSchema;
