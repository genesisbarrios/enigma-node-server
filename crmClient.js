const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// A "client" here is one of Enigma Labs' web design clients (e.g. Monark Barbershop).
// Each client website POSTs to /api/crm/* using its own unique `slug`.
const crmClientSchema = new Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    // Per-client admin panel password — lets each client site's admin page
    // use its own password instead of one shared secret across all clients.
    adminPassword: String,
    name: String,
    contactEmail: String,
    phone: String,
    website: String,
    instagram: String,
    googleBusinessUrl: String,
    // Tracking/analytics accounts the client connects from their admin's
    // "Connect accounts" panel. The first three are public tag IDs the site
    // loads on every page; gaPropertyId/searchConsoleSiteUrl are only used
    // server-side to read reports with Enigma's service account.
    gtmId: String,
    gaMeasurementId: String,
    metaPixelId: String,
    gaPropertyId: String,
    searchConsoleSiteUrl: String,
  },
  {
    timestamps: true,
  }
);

module.exports = crmClientSchema;
