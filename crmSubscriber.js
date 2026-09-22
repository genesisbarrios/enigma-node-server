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
    // Per-client interest checkboxes from the contact form — optional per
    // client (a client whose form doesn't ask these just never sets them),
    // shown as badges in the admin subscribers table. Field names are
    // specific to whichever client first needed them (prettykitty's
    // adopt/foster/volunteer, emepetgrooming's service types, ftlfuel's fuel
    // types, etc.) — add more of the same shape for a new client's own
    // categories.
    interestedAdopting: { type: Boolean, default: false },
    interestedFostering: { type: Boolean, default: false },
    interestedVolunteering: { type: Boolean, default: false },
    interestedFullGroom: { type: Boolean, default: false },
    interestedBathBrush: { type: Boolean, default: false },
    interestedNailTrim: { type: Boolean, default: false },
    interestedRegular: { type: Boolean, default: false },
    interestedPremium: { type: Boolean, default: false },
    interestedDiesel: { type: Boolean, default: false },
    // Pretty Kitty-specific — someone reporting/needing help with a stray
    // cat (TNR = trap-neuter-return) rather than adopting/fostering it.
    interestedTNR: { type: Boolean, default: false },
    interestedStrays: { type: Boolean, default: false },
    // Imperial Dialogue Studios-specific — the three services offered.
    interestedPodcast: { type: Boolean, default: false },
    interestedVideo: { type: Boolean, default: false },
    interestedStudio: { type: Boolean, default: false },
    // MHS Lube-specific — semi truck lube services.
    interestedOilChange: { type: Boolean, default: false },
    interestedFullService: { type: Boolean, default: false },
    interestedFleetService: { type: Boolean, default: false },
    // IP the submission came from — used only for the spam flood-limit check
    // in api/index.js (see isLikelySpamSubmission), not shown in the admin UI.
    submittedIp: String,
  },
  {
    timestamps: true,
  }
);

module.exports = crmSubscriberSchema;
