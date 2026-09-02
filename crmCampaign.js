const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// One record per "send" action from a client's admin OUTREACH panel — either
// a bulk campaign to many subscribers or a 1:1 reply to a single one (same
// pipeline, just recipients.length === 1). Recipients are a denormalized
// snapshot (email/name at send time) so history stays intact even if the
// subscriber is later edited or deleted.
const crmCampaignSchema = new Schema(
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
    // Which canned template this started from, if any — purely informational
    // (the actual subject/html sent is stored below regardless).
    templateKey: {
      type: String,
      enum: ["adopting", "fostering", "volunteering", "events", "reply", "custom"],
      default: "custom",
    },
    subject: String,
    html: String,
    recipients: [
      {
        subscriberId: { type: Schema.Types.ObjectId, ref: "CrmSubscriber" },
        email: String,
        name: String,
        resendId: String,
        error: String,
      },
    ],
    recipientCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

module.exports = crmCampaignSchema;
