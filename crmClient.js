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
  },
  {
    timestamps: true,
  }
);

module.exports = crmClientSchema;
