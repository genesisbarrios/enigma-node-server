const mongoose = require('mongoose');
const userSchema = require('../user');
const enigmaUserSchema = require('../enigmaUser');
const crmClientSchema = require('../crmClient');
const crmSubscriberSchema = require('../crmSubscriber');
const crmCampaignSchema = require('../crmCampaign');
const { connectGenwavDb, connectEnigmaDb, connectEnigmaCrmDb } = require('../connectdb');
const leadsRouter = require('../leads');
const { sendContactNotification, sendThankYouEmail, sendCrmCampaignEmail } = require('../email');
const cors = require('cors');
const express = require('express');
const serverless = require('serverless-http');

const app = express();
const router = express.Router();

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://localhost:3000',
      'https://127.0.0.1:3000',
      'https://enigma-labs.com',
      'https://www.enigma-labs.com',
      'https://monarkbarbershop.com',
      'https://www.monarkbarbershop.com',
      'https://monarkbarbershop.vercel.app',
      'https://javierhardscapingdesign.com',
      'https://www.javierhardscapingdesign.com',
      'https://javier-hardscaping-design.vercel.app',
      'https://jajasplate.com',
      'https://www.jajasplate.com',
      'https://jajas-plate.vercel.app',
      'https://prettykittymiamirescue.org',
      'https://www.prettykittymiamirescue.org',
      'https://pretty-kitty-miami-dade-rescue.vercel.app',
      'https://imperialdialoguestudios.com',
      'https://www.imperialdialoguestudios.com',
      'https://imperial-dialogue-studios.vercel.app'
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
};

app.use(express.json());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

const newsletterSubscriberSchema = new mongoose.Schema({
  email: String,
  beats: Boolean,
  loops: Boolean,
  visuals: Boolean,
  web: Boolean,
  createdAt: { type: Date, default: Date.now }
});

const onboardingClientSchema = new mongoose.Schema({
  clientName: String,
  businessName: String,
  email: String,
  phone: String,
  website: String,
  businessType: String,
  location: String,
  address: String,
  city: String,
  state: String,
  zipCode: String,
  country: String,
  businessHours: String,
  servicesArea: String,
  businessDescription: String,
  bio: String,
  servicesOffered: [String],
  audience: String,
  goals: String,
  offers: String,
  references: String,
  notes: String,
  googleBusinessCategory: String,
  googleBusinessKeywords: String,
  googleBusinessServices: String,
  googleBusinessPhotos: String,
  googleBusinessReviews: String,
  googleBusinessQuestions: String,
  googleBusinessVerification: String,
  createdAt: { type: Date, default: Date.now }
});

let UserModel;
let EnigmaUserModel;
let NewsletterSubscriberModel;
let OnboardingClientModel;
let CrmClientModel;
let CrmSubscriberModel;
let CrmCampaignModel;

async function ensureModels() {
  if (!UserModel) {
    const genwavConnection = await connectGenwavDb();
    UserModel = genwavConnection.model('User', userSchema);
  }

  if (!EnigmaUserModel) {
    const enigmaConnection = await connectEnigmaDb();
    EnigmaUserModel = enigmaConnection.model('EnigmaUser', enigmaUserSchema);
  }

  if (!NewsletterSubscriberModel || !OnboardingClientModel) {
    const enigmaConnection = await connectEnigmaDb();
    NewsletterSubscriberModel = enigmaConnection.model('NewsletterSubscriber', newsletterSubscriberSchema, 'newsletter');
    OnboardingClientModel = enigmaConnection.model('OnboardingClient', onboardingClientSchema, 'onboard');
  }

  if (!CrmClientModel || !CrmSubscriberModel || !CrmCampaignModel) {
    const enigmaCrmConnection = await connectEnigmaCrmDb();
    CrmClientModel = enigmaCrmConnection.model('CrmClient', crmClientSchema, 'clients');
    CrmSubscriberModel = enigmaCrmConnection.model('CrmSubscriber', crmSubscriberSchema, 'subscribers');
    CrmCampaignModel = enigmaCrmConnection.model('CrmCampaign', crmCampaignSchema, 'campaigns');
  }

  return {
    UserModel,
    EnigmaUserModel,
    NewsletterSubscriberModel,
    OnboardingClientModel,
    CrmClientModel,
    CrmSubscriberModel,
    CrmCampaignModel
  };
}

app.get('/', (_req, res) => {
  res.send('Hey this is my API running 🥳');
});

app.get('/api/onboarding/health', (_req, res) => {
  res.json({ ok: true, message: 'Onboarding API is running.' });
});

app.post('/api/newsletter/subscribe', async (req, res) => {
  try {
    const { NewsletterSubscriberModel } = await ensureModels();

    const payload = {
      email: req.body.email || '',
      beats: Boolean(req.body.beats),
      loops: Boolean(req.body.loops),
      visuals: Boolean(req.body.visuals),
      web: Boolean(req.body.web)
    };

    const existing = await NewsletterSubscriberModel.findOne({ email: payload.email });
    if (existing) {
      return res.status(200).json({ ok: true, message: 'Already subscribed.' });
    }

    const subscriber = await NewsletterSubscriberModel.create(payload);
    res.status(201).json({ ok: true, subscriber });
  } catch (error) {
    console.error('Newsletter subscription failed', error);
    res.status(500).json({ ok: false, message: 'Could not save newsletter subscription.' });
  }
});

app.post('/api/onboarding/submit', async (req, res) => {
  try {
    const { OnboardingClientModel } = await ensureModels();

    const payload = {
      clientName: req.body.clientName || '',
      businessName: req.body.businessName || '',
      email: req.body.email || '',
      phone: req.body.phone || '',
      website: req.body.website || '',
      businessType: req.body.businessType || '',
      location: req.body.location || '',
      address: req.body.address || '',
      city: req.body.city || '',
      state: req.body.state || '',
      zipCode: req.body.zipCode || '',
      country: req.body.country || '',
      businessHours: req.body.businessHours || '',
      servicesArea: req.body.servicesArea || '',
      businessDescription: req.body.businessDescription || '',
      bio: req.body.bio || '',
      servicesOffered: (req.body.servicesOffered || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      audience: req.body.audience || '',
      goals: req.body.goals || '',
      offers: req.body.offers || '',
      references: req.body.references || '',
      notes: req.body.notes || '',
      googleBusinessCategory: req.body.googleBusinessCategory || '',
      googleBusinessKeywords: req.body.googleBusinessKeywords || '',
      googleBusinessServices: req.body.googleBusinessServices || '',
      googleBusinessPhotos: req.body.googleBusinessPhotos || '',
      googleBusinessReviews: req.body.googleBusinessReviews || '',
      googleBusinessQuestions: req.body.googleBusinessQuestions || '',
      googleBusinessVerification: req.body.googleBusinessVerification || ''
    };

    const client = await OnboardingClientModel.create(payload);
    res.status(201).json({ ok: true, client });
  } catch (error) {
    console.error('Onboarding submission failed', error);
    res.status(500).json({ ok: false, message: 'Could not save onboarding request.' });
  }
});

app.get('/api/onboarding/clients', async (_req, res) => {
  try {
    const { OnboardingClientModel } = await ensureModels();
    const clients = await OnboardingClientModel.find().sort({ createdAt: -1 });
    res.json({ ok: true, clients });
  } catch (error) {
    console.error('Could not fetch clients', error);
    res.status(500).json({ ok: false, message: 'Could not fetch onboarding clients.' });
  }
});

app.get('/api/onboarding/clients/:id', async (req, res) => {
  try {
    const { OnboardingClientModel } = await ensureModels();
    const client = await OnboardingClientModel.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ ok: false, message: 'Client not found.' });
    }
    res.json({ ok: true, client });
  } catch (error) {
    console.error('Could not fetch client', error);
    res.status(500).json({ ok: false, message: 'Could not fetch client details.' });
  }
});

app.delete('/api/onboarding/clients/:id', async (req, res) => {
  try {
    const { OnboardingClientModel } = await ensureModels();
    const deleted = await OnboardingClientModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ ok: false, message: 'Client not found.' });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('Could not delete client', error);
    res.status(500).json({ ok: false, message: 'Could not delete client.' });
  }
});

// --- ENIGMA_CRM: client website contact forms + newsletter signups ---

// Master password works across every client (used for internal/ops access
// and to bootstrap a client's own password). Each client can additionally
// have its own adminPassword on its CrmClient record, checked below, so
// client A's password never grants access to client B's data.
const MASTER_ADMIN_PASSWORD = process.env.CRM_ADMIN_PASSWORD || 'pw';

async function requireClientAdminPassword(req, res, next) {
  try {
    const submitted = req.headers['x-admin-password'];
    if (!submitted) {
      return res.status(401).json({ ok: false, message: 'Invalid admin password.' });
    }
    if (submitted === MASTER_ADMIN_PASSWORD) {
      return next();
    }

    const clientSlug = (req.params.slug || req.body.clientSlug || '').trim();
    if (!clientSlug) {
      return res.status(401).json({ ok: false, message: 'Invalid admin password.' });
    }

    const { CrmClientModel } = await ensureModels();
    const client = await CrmClientModel.findOne({ slug: clientSlug });
    if (client && client.adminPassword && submitted === client.adminPassword) {
      return next();
    }

    return res.status(401).json({ ok: false, message: 'Invalid admin password.' });
  } catch (error) {
    console.error('Admin password check failed', error);
    res.status(500).json({ ok: false, message: 'Could not verify admin password.' });
  }
}

app.post('/api/crm/contact', async (req, res) => {
  try {
    const { CrmClientModel, CrmSubscriberModel } = await ensureModels();

    const clientSlug = (req.body.clientSlug || '').trim();
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim();
    const source = req.body.source === 'newsletter' ? 'newsletter' : 'contact_form';

    if (!clientSlug || !email) {
      return res.status(400).json({ ok: false, message: 'clientSlug and email are required.' });
    }

    if (source === 'newsletter') {
      const existing = await CrmSubscriberModel.findOne({ clientSlug, email, source: 'newsletter' });
      if (existing) {
        return res.status(200).json({ ok: true, message: 'Already subscribed.', subscriber: existing });
      }
    }

    let client = await CrmClientModel.findOne({ slug: clientSlug });
    if (!client) {
      client = await CrmClientModel.create({
        slug: clientSlug,
        name: req.body.clientName || clientSlug,
        contactEmail: req.body.clientContactEmail || '',
        phone: req.body.clientPhone || '',
        website: req.body.clientWebsite || '',
        instagram: req.body.clientInstagram || '',
        googleBusinessUrl: req.body.clientGoogleBusinessUrl || ''
      });
    } else {
      // Sync from whatever the site's own config just sent — the form is the
      // source of truth, so this self-heals a stale value saved on an
      // earlier submission (e.g. an old client record saved without "www.",
      // which broke the hero image URL built from client.website below).
      let dirty = false;
      if (req.body.clientContactEmail && client.contactEmail !== req.body.clientContactEmail) {
        client.contactEmail = req.body.clientContactEmail;
        dirty = true;
      }
      if (req.body.clientWebsite && client.website !== req.body.clientWebsite) {
        client.website = req.body.clientWebsite;
        dirty = true;
      }
      if (dirty) await client.save();
    }

    const phone = (req.body.phone || '').trim();
    const message = (req.body.message || '').trim();

    const subscriber = await CrmSubscriberModel.create({
      clientId: client._id,
      clientSlug,
      name,
      email,
      phone,
      message,
      source,
      interestedAdopting: Boolean(req.body.interestedAdopting),
      interestedFostering: Boolean(req.body.interestedFostering),
      interestedVolunteering: Boolean(req.body.interestedVolunteering)
    });

    if (source === 'contact_form') {
      sendContactNotification({
        to: client.contactEmail,
        clientName: client.name,
        submission: { name, email, phone, message }
      }).catch((err) => console.error('Contact notification email failed', err));
    }

    const website = req.body.clientWebsite || client.website || '';
    const siteUrl = website ? (website.startsWith('http') ? website : `https://${website}`) : '';

    sendThankYouEmail({
      to: email,
      name,
      clientName: client.name,
      source,
      siteUrl,
      donateUrl: req.body.clientDonateUrl || '',
      getInvolvedUrl: req.body.clientGetInvolvedUrl || '',
      heroImageUrl: siteUrl ? `${siteUrl}/hero.jpg` : '',
      replyTo: client.contactEmail || ''
    }).catch((err) => console.error('Thank-you email failed', err));

    res.status(201).json({ ok: true, subscriber });
  } catch (error) {
    console.error('CRM contact submission failed', error);
    res.status(500).json({ ok: false, message: 'Could not save contact submission.' });
  }
});

app.get('/api/crm/clients/:slug/subscribers', requireClientAdminPassword, async (req, res) => {
  try {
    const { CrmSubscriberModel } = await ensureModels();
    const subscribers = await CrmSubscriberModel.find({ clientSlug: req.params.slug }).sort({ createdAt: -1 });
    res.json({ ok: true, subscribers });
  } catch (error) {
    console.error('Could not fetch CRM subscribers', error);
    res.status(500).json({ ok: false, message: 'Could not fetch subscribers.' });
  }
});

// Admin's "+ Add Contact" button — a single manual add, distinct from the
// public /api/crm/contact route (no thank-you/notification emails fire
// here) and from /api/crm/subscribers/import (which is bulk, source
// always "import"). Lets the admin pick any source and set interests.
app.post('/api/crm/subscribers', requireClientAdminPassword, async (req, res) => {
  try {
    const { CrmClientModel, CrmSubscriberModel } = await ensureModels();

    const clientSlug = (req.body.clientSlug || '').trim();
    const email = (req.body.email || '').trim();
    if (!clientSlug || !email) {
      return res.status(400).json({ ok: false, message: 'clientSlug and email are required.' });
    }

    const client = await CrmClientModel.findOne({ slug: clientSlug });
    if (!client) {
      return res.status(404).json({ ok: false, message: 'Client not found.' });
    }

    const existing = await CrmSubscriberModel.findOne({ clientSlug, email });
    if (existing) {
      return res.status(200).json({ ok: true, subscriber: existing, duplicate: true, message: 'A contact with this email already exists.' });
    }

    const subscriber = await CrmSubscriberModel.create({
      clientId: client._id,
      clientSlug,
      name: (req.body.name || '').trim(),
      email,
      phone: (req.body.phone || '').trim(),
      message: (req.body.message || '').trim(),
      source: ['contact_form', 'newsletter', 'import'].includes(req.body.source) ? req.body.source : 'contact_form',
      interestedAdopting: Boolean(req.body.interestedAdopting),
      interestedFostering: Boolean(req.body.interestedFostering),
      interestedVolunteering: Boolean(req.body.interestedVolunteering)
    });

    res.status(201).json({ ok: true, subscriber });
  } catch (error) {
    console.error('Could not add CRM subscriber', error);
    res.status(500).json({ ok: false, message: 'Could not add contact.' });
  }
});

// Edit a subscriber's own info — the admin table's Edit button. Scoped to
// the subscriber's own clientSlug so one client's admin password can't be
// used to edit another client's contact.
app.patch('/api/crm/subscribers/:id', requireClientAdminPassword, async (req, res) => {
  try {
    const { CrmSubscriberModel } = await ensureModels();
    const subscriber = await CrmSubscriberModel.findById(req.params.id);
    if (!subscriber) {
      return res.status(404).json({ ok: false, message: 'Subscriber not found.' });
    }
    if (req.body.clientSlug && subscriber.clientSlug !== req.body.clientSlug) {
      return res.status(403).json({ ok: false, message: 'Subscriber does not belong to this client.' });
    }

    const fields = ['name', 'email', 'phone', 'message', 'source', 'interestedAdopting', 'interestedFostering', 'interestedVolunteering'];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) subscriber[field] = req.body[field];
    });
    await subscriber.save();

    res.json({ ok: true, subscriber });
  } catch (error) {
    console.error('Could not update CRM subscriber', error);
    res.status(500).json({ ok: false, message: 'Could not update subscriber.' });
  }
});

app.delete('/api/crm/subscribers/:id', requireClientAdminPassword, async (req, res) => {
  try {
    const { CrmSubscriberModel } = await ensureModels();
    const subscriber = await CrmSubscriberModel.findById(req.params.id);
    if (!subscriber) {
      return res.status(404).json({ ok: false, message: 'Subscriber not found.' });
    }
    if (req.body.clientSlug && subscriber.clientSlug !== req.body.clientSlug) {
      return res.status(403).json({ ok: false, message: 'Subscriber does not belong to this client.' });
    }
    await CrmSubscriberModel.deleteOne({ _id: subscriber._id });
    res.json({ ok: true });
  } catch (error) {
    console.error('Could not delete CRM subscriber', error);
    res.status(500).json({ ok: false, message: 'Could not delete subscriber.' });
  }
});

// Overall Resend account cap across every client site this backend serves —
// set to whatever your actual Resend plan's daily send limit is (defaults
// to Resend's free-tier 100/day). Each client below gets capped to a slice
// of this shared pool so one client's campaign can't eat everyone else's
// quota.
const RESEND_DAILY_LIMIT = Number(process.env.RESEND_DAILY_LIMIT) || 100;

// Per-client share of RESEND_DAILY_LIMIT, as a percent. A client not listed
// here has no cap enforced. Starting with just prettykitty for now — add
// other clients' slugs here as their own outreach volume ramps up.
const CLIENT_DAILY_SEND_LIMIT_PERCENT = {
  'pretty-kitty-miami-dade-rescue': 5
};

async function getDailySendLimit(CrmCampaignModel, clientSlug) {
  const percent = CLIENT_DAILY_SEND_LIMIT_PERCENT[clientSlug];
  if (percent == null) {
    return { limit: null, usedToday: 0, remaining: null };
  }

  const limit = Math.max(1, Math.floor((RESEND_DAILY_LIMIT * percent) / 100));

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todaysCampaigns = await CrmCampaignModel.find({ clientSlug, createdAt: { $gte: startOfDay } }, 'recipients');
  const usedToday = todaysCampaigns.reduce(
    (sum, c) => sum + c.recipients.filter((r) => !r.error).length,
    0
  );

  return { limit, usedToday, remaining: Math.max(0, limit - usedToday) };
}

// Shows the admin's current OUTREACH daily send limit (and how much of it
// is used today) so the panel can display it live and warn before sending.
app.get('/api/crm/clients/:slug/send-limit', requireClientAdminPassword, async (req, res) => {
  try {
    const { CrmCampaignModel } = await ensureModels();
    const status = await getDailySendLimit(CrmCampaignModel, req.params.slug);
    res.json({ ok: true, ...status });
  } catch (error) {
    console.error('Could not compute send limit', error);
    res.status(500).json({ ok: false, message: 'Could not compute send limit.' });
  }
});

// OUTREACH: send a campaign (or a single 1:1 reply — same pipeline, just one
// recipient) to an explicit list of subscriber ids. The admin UI resolves
// "select all" / "select by source" into this same explicit id list before
// calling here, so what's logged always matches exactly who was emailed.
app.post('/api/crm/campaigns/send', requireClientAdminPassword, async (req, res) => {
  try {
    const { CrmClientModel, CrmSubscriberModel, CrmCampaignModel } = await ensureModels();

    const clientSlug = (req.body.clientSlug || '').trim();
    const subject = (req.body.subject || '').trim();
    const html = req.body.html || '';
    const templateKey = req.body.templateKey || 'custom';
    const recipientIds = Array.isArray(req.body.recipientIds) ? req.body.recipientIds : [];

    if (!clientSlug || !subject || !html || recipientIds.length === 0) {
      return res.status(400).json({ ok: false, message: 'clientSlug, subject, html, and at least one recipient are required.' });
    }

    const client = await CrmClientModel.findOne({ slug: clientSlug });
    if (!client) {
      return res.status(404).json({ ok: false, message: 'Client not found.' });
    }

    // Reject the whole send up front (not partway through) if it would push
    // this client over its slice of the shared daily Resend limit.
    const limitStatus = await getDailySendLimit(CrmCampaignModel, clientSlug);
    if (limitStatus.limit != null && limitStatus.usedToday + recipientIds.length > limitStatus.limit) {
      return res.status(429).json({
        ok: false,
        message: `Sending to ${recipientIds.length} would exceed today's limit of ${limitStatus.limit} (${limitStatus.usedToday} already sent, ${limitStatus.remaining} remaining).`,
        limitExceeded: true,
        ...limitStatus
      });
    }

    const subscribers = await CrmSubscriberModel.find({ _id: { $in: recipientIds }, clientSlug });

    const recipients = [];
    for (const subscriber of subscribers) {
      const result = await sendCrmCampaignEmail({
        to: subscriber.email,
        name: subscriber.name,
        clientName: client.name,
        subject,
        html,
        replyTo: client.contactEmail || ''
      });
      recipients.push({
        subscriberId: subscriber._id,
        email: subscriber.email,
        name: subscriber.name,
        resendId: result.resendId || '',
        error: result.ok ? '' : (result.error || 'Failed to send')
      });
    }

    const campaign = await CrmCampaignModel.create({
      clientId: client._id,
      clientSlug,
      templateKey,
      subject,
      html,
      recipients,
      recipientCount: recipients.length
    });

    res.status(201).json({ ok: true, campaign });
  } catch (error) {
    console.error('Could not send CRM campaign', error);
    res.status(500).json({ ok: false, message: 'Could not send campaign.' });
  }
});

app.get('/api/crm/clients/:slug/campaigns', requireClientAdminPassword, async (req, res) => {
  try {
    const { CrmCampaignModel } = await ensureModels();
    const campaigns = await CrmCampaignModel.find({ clientSlug: req.params.slug }).sort({ createdAt: -1 });
    res.json({ ok: true, campaigns });
  } catch (error) {
    console.error('Could not fetch CRM campaigns', error);
    res.status(500).json({ ok: false, message: 'Could not fetch campaigns.' });
  }
});

app.post('/api/crm/subscribers/import', requireClientAdminPassword, async (req, res) => {
  try {
    const { CrmClientModel, CrmSubscriberModel } = await ensureModels();

    const clientSlug = (req.body.clientSlug || '').trim();
    const rows = Array.isArray(req.body.subscribers) ? req.body.subscribers : [];

    if (!clientSlug || rows.length === 0) {
      return res.status(400).json({ ok: false, message: 'clientSlug and a non-empty subscribers array are required.' });
    }

    let client = await CrmClientModel.findOne({ slug: clientSlug });
    if (!client) {
      client = await CrmClientModel.create({ slug: clientSlug, name: req.body.clientName || clientSlug });
    }

    const existingEmails = new Set(
      (await CrmSubscriberModel.find({ clientSlug }, 'email')).map((s) => s.email)
    );

    const toInsert = rows
      .map((row) => ({
        clientId: client._id,
        clientSlug,
        name: (row.name || '').trim(),
        email: (row.email || '').trim(),
        phone: (row.phone || '').trim(),
        message: (row.message || '').trim(),
        source: 'import'
      }))
      .filter((row) => row.email && !existingEmails.has(row.email));

    const inserted = toInsert.length > 0 ? await CrmSubscriberModel.insertMany(toInsert) : [];

    res.status(201).json({ ok: true, insertedCount: inserted.length, skippedCount: rows.length - inserted.length });
  } catch (error) {
    console.error('CRM subscriber import failed', error);
    res.status(500).json({ ok: false, message: 'Could not import subscribers.' });
  }
});

// Master-password only: sets or rotates a single client's own admin
// password, so each client site can have a distinct password instead of
// sharing the master one.
app.patch('/api/crm/clients/:slug/admin-password', async (req, res) => {
  try {
    if (req.headers['x-admin-password'] !== MASTER_ADMIN_PASSWORD) {
      return res.status(401).json({ ok: false, message: 'Invalid admin password.' });
    }

    const clientSlug = (req.params.slug || '').trim();
    const newPassword = (req.body.newPassword || '').trim();
    if (!clientSlug || !newPassword) {
      return res.status(400).json({ ok: false, message: 'clientSlug and newPassword are required.' });
    }

    const { CrmClientModel } = await ensureModels();
    const client = await CrmClientModel.findOneAndUpdate(
      { slug: clientSlug },
      { adminPassword: newPassword },
      { new: true }
    );

    if (!client) {
      return res.status(404).json({ ok: false, message: 'Client not found.' });
    }

    res.json({ ok: true, message: 'Admin password updated.' });
  } catch (error) {
    console.error('Could not update client admin password', error);
    res.status(500).json({ ok: false, message: 'Could not update admin password.' });
  }
});

app.post('/addUser', async (req, res) => {
  const { email, producer, artist, fan, name, phoneNumber, instagram } = req.body;
  console.log(req.body);
  console.log('add user');
  try {
    const { UserModel } = await ensureModels();

    const user = await UserModel.findOne({ email });

    if (user) {
      res.status(400).json({ message: 'You already signed up!' });
    } else {
      const newUser = new UserModel({
        email,
        producer,
        artist,
        fan,
        name,
        phoneNumber,
        instagram
      });

      await newUser.save();
      console.log('saved user!');
      res.status(200).json({ message: 'User added successfully' });
    }
  } catch (error) {
    console.log('failed');
    console.log(error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/addUserEnigma', async (req, res) => {
  const { email, beats, loops, visuals, web } = req.body;
  console.log('add user enigma');
  try {
    const { EnigmaUserModel } = await ensureModels();

    const user = await EnigmaUserModel.findOne({ email });

    if (user) {
      res.status(400).json({ message: 'You already signed up!' });
    } else {
      const newUser = new EnigmaUserModel({
        email,
        beats,
        loops,
        visuals,
        web
      });

      await newUser.save();
      console.log('saved user!');
      res.status(200).json({ message: 'User added successfully' });
    }
  } catch (error) {
    console.log('failed');
    console.log(error);
    res.status(400).json({ error: error.message });
  }
});

app.use('/api/leads', leadsRouter);

app.use('/api', router);

module.exports = app;
module.exports.handler = serverless(app);