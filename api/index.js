const mongoose = require('mongoose');
const userSchema = require('../user');
const enigmaUserSchema = require('../enigmaUser');
const crmClientSchema = require('../crmClient');
const crmSubscriberSchema = require('../crmSubscriber');
const crmCampaignSchema = require('../crmCampaign');
const crmEventSchema = require('../crmEvent');
const crmOrderSchema = require('../crmOrder');
const { createSign } = require('crypto');
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
// ePayco's confirmation call can arrive as a regular form POST.
app.use(express.urlencoded({ extended: false }));
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
let CrmEventModel;
let CrmOrderModel;

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

  if (!CrmClientModel || !CrmSubscriberModel || !CrmCampaignModel || !CrmEventModel || !CrmOrderModel) {
    const enigmaCrmConnection = await connectEnigmaCrmDb();
    CrmClientModel = enigmaCrmConnection.model('CrmClient', crmClientSchema, 'clients');
    CrmSubscriberModel = enigmaCrmConnection.model('CrmSubscriber', crmSubscriberSchema, 'subscribers');
    CrmCampaignModel = enigmaCrmConnection.model('CrmCampaign', crmCampaignSchema, 'campaigns');
    CrmEventModel = enigmaCrmConnection.model('CrmEvent', crmEventSchema, 'events');
    CrmOrderModel = enigmaCrmConnection.model('CrmOrder', crmOrderSchema, 'orders');
  }

  return {
    UserModel,
    EnigmaUserModel,
    NewsletterSubscriberModel,
    OnboardingClientModel,
    CrmClientModel,
    CrmSubscriberModel,
    CrmCampaignModel,
    CrmEventModel,
    CrmOrderModel
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

function getRequestIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || req.ip || '';
}

// Throwaway/disposable inboxes — real prospects don't sign up for a cat
// rescue's newsletter with a 10-minute burner address; spam bots do it
// constantly to dodge per-email dedup.
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.info', 'sharklasers.com',
  'tempmail.com', 'temp-mail.org', 'tempmailo.com', '10minutemail.com', '10minutemail.net',
  'throwawaymail.com', 'yopmail.com', 'trashmail.com', 'getnada.com', 'fakeinbox.com',
  'dispostable.com', 'maildrop.cc', 'spam4.me', 'mintemail.com', 'moakt.com',
  'emailondeck.com', 'mailnesia.com', 'discard.email', 'tempinbox.com',
  'fakemailgenerator.com', 'mohmal.com', 'crazymailing.com', 'inboxkitten.com', 'burnermail.io'
]);

// Promo/link spam in a "tell us about yourself" field is essentially never
// legitimate — real inquiries don't come with a backlink or a casino pitch.
const SPAM_URL_RE = /https?:\/\/|www\.\S+\.\S{2,}/i;
const SPAM_KEYWORD_RE = /\b(seo services?|backlinks?|link building|increase your (ranking|traffic)|crypto (invest|trading)|forex trading|payday loans?|bad credit loan|male enhancement|weight loss pills|casino bonus|adult content|bulk email|dropship)\b/i;

// Catches keyboard-mash/algorithmically-generated names — the pattern
// actually reported on prettykittymiami's newsletter signups (real-looking
// email, gibberish name). This matters specifically for the newsletter form,
// which has no message field for SPAM_KEYWORD_RE/SPAM_URL_RE to scan, so a
// bot that clears the honeypot/timing/disposable-domain checks (real Gmail
// address, one submission per IP, waits out the 4s timer) previously sailed
// straight through. Deliberately conservative to avoid false-positiving
// real names:
//   - digits in a name field are never legitimate
//   - a run of 5+ consonants in a row doesn't occur in real names (checked
//     against e.g. "Kirchner", "Nkemdirim" while writing this)
//   - a name with letters but zero vowels (treating y as a vowel, for
//     names like "Lynch") isn't a real word
//   - 2+ lowercase-to-uppercase transitions mid-string is a random-case-
//     generator fingerprint; requiring 2 (not 1) avoids false-flagging
//     genuine "Mc"/"Mac"-prefixed names (McDonald has exactly one)
// An empty/absent name is fine — the field is optional, and a blank isn't
// evidence of anything.
function looksLikeGibberishName(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return false;
  if (/\d/.test(trimmed)) return true;
  if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(trimmed)) return true;
  const letters = trimmed.replace(/[^a-z]/gi, '');
  if (letters.length >= 4 && !/[aeiouy]/i.test(letters)) return true;
  const caseTransitions = (trimmed.match(/[a-z][A-Z]/g) || []).length;
  if (caseTransitions >= 2) return true;
  return false;
}

// Bot defense for the public /api/crm/contact endpoint, shared by every
// client site's contact form and newsletter signup. Mirrors the same
// honeypot + timing-trap + IP-flood pattern used elsewhere in this workspace
// (see enigmalabs/server.js isLikelySpamSubmission) — every client form
// already sends a hidden "website" field and a formLoadedAt timestamp.
async function isLikelySpamSubmission(req, CrmSubscriberModel) {
  // Honeypot: a hidden field real users never see or fill; bots that
  // auto-fill every input on the page populate it.
  if (req.body.website) return true;

  // Timing trap: the form reports how long it was open before submit — a
  // human takes noticeably longer than this to fill name/email/message.
  // Raised from 2s to 4s since a flat 2s cutoff is trivial for a bot to clear.
  const formLoadedAt = Number(req.body.formLoadedAt) || 0;
  if (!formLoadedAt || Date.now() - formLoadedAt < 4000) return true;

  const email = (req.body.email || '').toLowerCase().trim();
  const emailDomain = email.split('@')[1] || '';
  if (DISPOSABLE_EMAIL_DOMAINS.has(emailDomain)) return true;

  const freeText = `${req.body.name || ''} ${req.body.message || ''}`;
  if (SPAM_URL_RE.test(freeText) || SPAM_KEYWORD_RE.test(freeText)) return true;

  if (looksLikeGibberishName(req.body.name)) return true;

  // Per-IP flood limit — tightened from 5 to 3 submissions (any client) from
  // the same IP in 15 minutes; a real prospect doesn't submit that often.
  const ip = getRequestIp(req);
  if (ip) {
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentCount = await CrmSubscriberModel.countDocuments({
      submittedIp: ip,
      createdAt: { $gte: fifteenMinAgo },
    });
    if (recentCount >= 3) return true;
  }

  return false;
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

    // Spam responds identically to a real success so scripted abuse gets no
    // feedback to adapt to — it just silently never becomes a subscriber.
    if (await isLikelySpamSubmission(req, CrmSubscriberModel)) {
      return res.status(201).json({ ok: true, message: 'Submission received.' });
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
      interestedVolunteering: Boolean(req.body.interestedVolunteering),
      interestedFullGroom: Boolean(req.body.interestedFullGroom),
      interestedBathBrush: Boolean(req.body.interestedBathBrush),
      interestedNailTrim: Boolean(req.body.interestedNailTrim),
      interestedRegular: Boolean(req.body.interestedRegular),
      interestedPremium: Boolean(req.body.interestedPremium),
      interestedDiesel: Boolean(req.body.interestedDiesel),
      interestedTNR: Boolean(req.body.interestedTNR),
      interestedStrays: Boolean(req.body.interestedStrays),
      interestedPodcast: Boolean(req.body.interestedPodcast),
      interestedVideo: Boolean(req.body.interestedVideo),
      interestedStudio: Boolean(req.body.interestedStudio),
      interestedOilChange: Boolean(req.body.interestedOilChange),
      interestedFullService: Boolean(req.body.interestedFullService),
      interestedFleetService: Boolean(req.body.interestedFleetService),
      submittedIp: getRequestIp(req)
    });

    if (source === 'contact_form') {
      sendContactNotification({
        to: client.contactEmail,
        clientName: client.name,
        submission: { name, email, phone, message },
        replyTo: email
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
      interestedVolunteering: Boolean(req.body.interestedVolunteering),
      interestedFullGroom: Boolean(req.body.interestedFullGroom),
      interestedBathBrush: Boolean(req.body.interestedBathBrush),
      interestedNailTrim: Boolean(req.body.interestedNailTrim),
      interestedRegular: Boolean(req.body.interestedRegular),
      interestedPremium: Boolean(req.body.interestedPremium),
      interestedDiesel: Boolean(req.body.interestedDiesel),
      interestedTNR: Boolean(req.body.interestedTNR),
      interestedStrays: Boolean(req.body.interestedStrays),
      interestedPodcast: Boolean(req.body.interestedPodcast),
      interestedVideo: Boolean(req.body.interestedVideo),
      interestedStudio: Boolean(req.body.interestedStudio),
      interestedOilChange: Boolean(req.body.interestedOilChange),
      interestedFullService: Boolean(req.body.interestedFullService),
      interestedFleetService: Boolean(req.body.interestedFleetService)
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

    const fields = ['name', 'email', 'phone', 'message', 'source', 'interestedAdopting', 'interestedFostering', 'interestedVolunteering', 'interestedFullGroom', 'interestedBathBrush', 'interestedNailTrim', 'interestedRegular', 'interestedPremium', 'interestedDiesel', 'interestedTNR', 'interestedStrays', 'interestedPodcast', 'interestedVideo', 'interestedStudio', 'interestedOilChange', 'interestedFullService', 'interestedFleetService'];
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

    // Optional — an ISO datetime from the admin's schedule picker. Resend
    // holds each recipient's email and delivers it at this time instead of
    // right away. Left out (or blank) sends immediately, same as before.
    let scheduledAt;
    if (req.body.scheduledAt) {
      const parsed = new Date(req.body.scheduledAt);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ ok: false, message: 'Invalid scheduled time.' });
      }
      if (parsed.getTime() <= Date.now()) {
        return res.status(400).json({ ok: false, message: 'Scheduled time must be in the future.' });
      }
      scheduledAt = parsed.toISOString();
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
        replyTo: client.contactEmail || '',
        scheduledAt
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
      recipientCount: recipients.length,
      scheduledAt
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

// ── Mailing List & Analytics ──────────────────────────────────────────────
// Click tracking, per-client tracking IDs (GTM / GA4 / Meta Pixel), and
// GA4 + Search Console reports for each client site's admin.

const CRM_EVENT_TYPES = ['page_view', 'phone_click', 'email_click', 'social_click'];

// Public tag IDs get injected into every page's <script>, so they're
// strictly validated here — never trust admin input inside a script tag.
const TRACKING_FIELD_PATTERNS = {
  gtmId: /^GTM-[A-Z0-9]{4,12}$/,
  gaMeasurementId: /^G-[A-Z0-9]{4,15}$/,
  metaPixelId: /^\d{8,20}$/,
  gaPropertyId: /^\d{5,15}$/,
  searchConsoleSiteUrl: /^(sc-domain:[a-z0-9.-]+\.[a-z]{2,}|https?:\/\/[^\s"'<>]+\/)$/i,
  // ePayco P_CUST_ID_CLIENTE — orders are only accepted from this account.
  epaycoCustId: /^\d{3,12}$/,
};

function clientTrackingSettings(client) {
  const out = {};
  for (const key of Object.keys(TRACKING_FIELD_PATTERNS)) out[key] = (client && client[key]) || '';
  return out;
}

// Recorded server-to-server by each site's /api/crm/events proxy.
app.post('/api/crm/events', async (req, res) => {
  try {
    const { CrmClientModel, CrmEventModel } = await ensureModels();
    const clientSlug = String(req.body.clientSlug || '').trim();
    const type = String(req.body.type || '');
    if (!/^[a-z0-9-]{2,60}$/.test(clientSlug) || !CRM_EVENT_TYPES.includes(type)) {
      return res.status(400).json({ ok: false, message: 'Invalid event.' });
    }
    // Same as /api/crm/contact: a client's first activity creates its record.
    await CrmClientModel.updateOne(
      { slug: clientSlug },
      { $setOnInsert: { slug: clientSlug, name: String(req.body.clientName || clientSlug).slice(0, 100) } },
      { upsert: true }
    );
    const visitorId = String(req.body.visitorId || '');
    await CrmEventModel.create({
      clientSlug,
      type,
      label: String(req.body.label || '').slice(0, 60),
      path: String(req.body.path || '').slice(0, 200),
      ...(/^[a-z0-9-]{8,40}$/.test(visitorId) ? { visitorId } : {}),
    });
    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Could not record CRM event', error);
    res.status(500).json({ ok: false, message: 'Could not record event.' });
  }
});

// Internal analytics cards: signups/submissions from subscribers, clicks
// from events. ?days=N limits to the last N days (default: all time).
app.get('/api/crm/clients/:slug/stats', requireClientAdminPassword, async (req, res) => {
  try {
    const { CrmSubscriberModel, CrmEventModel } = await ensureModels();
    const slug = req.params.slug;
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 0, 0), 3650);
    const since = days ? { createdAt: { $gte: new Date(Date.now() - days * 86400000) } } : {};

    const [newsletterSignups, contactSubmissions, clickGroups, socialGroups, visitorGroups] = await Promise.all([
      CrmSubscriberModel.countDocuments({ clientSlug: slug, source: 'newsletter', ...since }),
      CrmSubscriberModel.countDocuments({ clientSlug: slug, source: 'contact_form', ...since }),
      CrmEventModel.aggregate([{ $match: { clientSlug: slug, ...since } }, { $group: { _id: '$type', n: { $sum: 1 } } }]),
      CrmEventModel.aggregate([
        { $match: { clientSlug: slug, type: 'social_click', ...since } },
        { $group: { _id: '$label', n: { $sum: 1 } } },
        { $sort: { n: -1 } },
      ]),
      // Unique visitors = distinct anonymous visitor IDs among page views.
      CrmEventModel.aggregate([
        { $match: { clientSlug: slug, type: 'page_view', visitorId: { $exists: true }, ...since } },
        { $group: { _id: '$visitorId' } },
        { $count: 'n' },
      ]),
    ]);
    const clicks = Object.fromEntries(clickGroups.map((g) => [g._id, g.n]));
    res.json({
      ok: true,
      days,
      visitors: visitorGroups[0]?.n || 0,
      pageViews: clicks.page_view || 0,
      newsletterSignups,
      contactSubmissions,
      phoneClicks: clicks.phone_click || 0,
      emailClicks: clicks.email_click || 0,
      socialClicks: clicks.social_click || 0,
      socialBreakdown: socialGroups.map((g) => ({ label: g._id || 'other', count: g.n })),
    });
  } catch (error) {
    console.error('Could not load CRM stats', error);
    res.status(500).json({ ok: false, message: 'Could not load stats.' });
  }
});

// Public: the tag IDs a site loads on every page. Only the three public
// IDs — never the property ID or Search Console URL.
app.get('/api/crm/clients/:slug/tracking', async (req, res) => {
  try {
    const { CrmClientModel } = await ensureModels();
    const client = await CrmClientModel.findOne({ slug: req.params.slug }).lean();
    const { gtmId, gaMeasurementId, metaPixelId } = clientTrackingSettings(client);
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ ok: true, gtmId, gaMeasurementId, metaPixelId });
  } catch (error) {
    console.error('Could not load tracking IDs', error);
    res.status(500).json({ ok: false, message: 'Could not load tracking IDs.' });
  }
});

app.get('/api/crm/clients/:slug/settings', requireClientAdminPassword, async (req, res) => {
  try {
    const { CrmClientModel } = await ensureModels();
    const client = await CrmClientModel.findOne({ slug: req.params.slug }).lean();
    res.json({
      ok: true,
      settings: clientTrackingSettings(client),
      serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    });
  } catch (error) {
    console.error('Could not load client settings', error);
    res.status(500).json({ ok: false, message: 'Could not load settings.' });
  }
});

app.patch('/api/crm/clients/:slug/settings', requireClientAdminPassword, async (req, res) => {
  try {
    const { CrmClientModel } = await ensureModels();
    const updates = {};
    for (const [key, pattern] of Object.entries(TRACKING_FIELD_PATTERNS)) {
      if (req.body[key] === undefined) continue;
      const value = String(req.body[key] || '').trim();
      if (value && !pattern.test(value)) {
        return res.status(400).json({ ok: false, field: key, message: `That ${key} doesn't look right.` });
      }
      updates[key] = value;
    }
    const client = await CrmClientModel.findOneAndUpdate(
      { slug: req.params.slug },
      { $set: updates, $setOnInsert: { slug: req.params.slug, name: req.params.slug } },
      { new: true, upsert: true }
    ).lean();
    res.json({ ok: true, settings: clientTrackingSettings(client) });
  } catch (error) {
    console.error('Could not save client settings', error);
    res.status(500).json({ ok: false, message: 'Could not save settings.' });
  }
});

// Google service-account auth (JWT bearer flow) — no googleapis dependency.
// Each client grants GOOGLE_SERVICE_ACCOUNT_EMAIL Viewer access to their GA4
// property and a user on their Search Console property.
let googleTokenCache = { token: '', expiresAt: 0 };
async function getGoogleAccessToken() {
  if (googleTokenCache.token && googleTokenCache.expiresAt > Date.now() + 60000) return googleTokenCache.token;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '').replace(/\\n/g, '\n');
  if (!email || !key) return '';
  const now = Math.floor(Date.now() / 1000);
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(key).toString('base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error(`Google auth failed: ${data.error_description || data.error || res.status}`);
  googleTokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
  return data.access_token;
}

async function runGaReport(token, propertyId, body) {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `GA report failed (${res.status})`);
  return (data.rows || []).map((row) => ({
    dims: (row.dimensionValues || []).map((d) => d.value),
    metrics: (row.metricValues || []).map((m) => Number(m.value)),
  }));
}

async function getGaSummary(token, propertyId, days) {
  const dateRanges = [{ startDate: `${days}daysAgo`, endDate: 'today' }];
  const breakdown = async (dimension, limit) =>
    (await runGaReport(token, propertyId, {
      dateRanges,
      dimensions: [{ name: dimension }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit,
    })).map((r) => ({ label: r.dims[0], users: r.metrics[0] }));
  const [totals, cities, countries, ages, genders] = await Promise.all([
    runGaReport(token, propertyId, {
      dateRanges,
      metrics: [{ name: 'activeUsers' }, { name: 'newUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
    }),
    breakdown('city', 8),
    breakdown('country', 5),
    // Age/gender only populate with Google signals on, and GA withholds them
    // under its privacy thresholds — empty is normal for small sites.
    breakdown('userAgeBracket', 8),
    breakdown('userGender', 4),
  ]);
  const t = totals[0]?.metrics || [0, 0, 0, 0];
  const known = (list) => list.filter((x) => x.label && x.label !== '(not set)' && x.label !== 'unknown');
  return {
    visitors: t[0], newVisitors: t[1], sessions: t[2], pageViews: t[3],
    cities: known(cities), countries: known(countries), ages: known(ages), genders: known(genders),
  };
}

async function getSearchConsoleSummary(token, siteUrl, days) {
  const end = new Date(Date.now() - 2 * 86400000); // Search Console lags ~2 days
  const start = new Date(end.getTime() - days * 86400000);
  const ymd = (d) => d.toISOString().slice(0, 10);
  const query = async (body) => {
    const res = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: ymd(start), endDate: ymd(end), ...body }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `Search Console query failed (${res.status})`);
    return data.rows || [];
  };
  const [totals, queries] = await Promise.all([query({}), query({ dimensions: ['query'], rowLimit: 10 })]);
  const t = totals[0] || {};
  return {
    clicks: t.clicks || 0,
    impressions: t.impressions || 0,
    ctr: t.ctr || 0,
    position: t.position || 0,
    topQueries: queries.map((r) => ({
      query: r.keys[0], clicks: r.clicks, impressions: r.impressions, position: r.position,
    })),
  };
}

// Website analytics for the admin: GA4 + Search Console, each reported
// independently so one misconfigured account doesn't hide the other.
app.get('/api/crm/clients/:slug/web-analytics', requireClientAdminPassword, async (req, res) => {
  try {
    const { CrmClientModel } = await ensureModels();
    const client = await CrmClientModel.findOne({ slug: req.params.slug }).lean();
    const settings = clientTrackingSettings(client);
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 28, 1), 365);
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';

    let token = '';
    let authError = '';
    if (settings.gaPropertyId || settings.searchConsoleSiteUrl) {
      try {
        token = await getGoogleAccessToken();
        if (!token) authError = 'Google service account is not configured on the backend.';
      } catch (error) {
        authError = error.message;
      }
    }

    const section = async (configured, load) => {
      if (!configured) return { connected: false };
      if (!token) return { connected: true, error: authError };
      try {
        return { connected: true, data: await load() };
      } catch (error) {
        return { connected: true, error: error.message };
      }
    };

    const [ga, searchConsole] = await Promise.all([
      section(settings.gaPropertyId, () => getGaSummary(token, settings.gaPropertyId, days)),
      section(settings.searchConsoleSiteUrl, () => getSearchConsoleSummary(token, settings.searchConsoleSiteUrl, days)),
    ]);
    res.json({ ok: true, days, serviceAccountEmail, ga, searchConsole });
  } catch (error) {
    console.error('Could not load web analytics', error);
    res.status(500).json({ ok: false, message: 'Could not load web analytics.' });
  }
});

// ── Orders (ePayco payment links) ─────────────────────────────────────────
// Every way an order arrives — ePayco's confirmation call, the buyer
// landing on the site's /order-complete page, or the client pasting a
// reference into the admin — goes through recordEpaycoOrder(), which fetches
// the transaction from ePayco's own validation API. Payment data is never
// taken from the caller, so nobody can fake an order by hitting these URLs.

const EPAYCO_STATUS = { 1: 'paid', 2: 'rejected', 3: 'pending', 4: 'failed' };

async function fetchEpaycoTransaction(refPayco) {
  const res = await fetch(`https://secure.epayco.co/validation/v1/reference/${encodeURIComponent(refPayco)}`);
  const json = await res.json().catch(() => ({}));
  if (!json || !json.success && !json.status || !json.data || !json.data.x_ref_payco) return null;
  return json.data;
}

async function recordEpaycoOrder(clientSlug, refPayco) {
  const ref = String(refPayco || '').trim();
  if (!/^[A-Za-z0-9-]{4,40}$/.test(ref)) return { ok: false, status: 400, message: 'Invalid reference.' };

  const { CrmClientModel, CrmOrderModel } = await ensureModels();
  const client = await CrmClientModel.findOne({ slug: clientSlug }).lean();
  if (!client) return { ok: false, status: 404, message: 'Unknown client.' };
  if (!client.epaycoCustId) {
    return { ok: false, status: 409, message: 'Set the ePayco customer ID in the admin before importing orders.' };
  }

  const data = await fetchEpaycoTransaction(ref);
  if (!data) return { ok: false, status: 404, message: 'ePayco has no transaction with that reference.' };

  // Only accept transactions paid to this client's own ePayco account.
  const custId = String(data.x_cust_id_cliente || '');
  if (custId && custId !== String(client.epaycoCustId)) {
    return { ok: false, status: 403, message: 'That transaction belongs to a different ePayco account.' };
  }
  if (!custId) console.warn(`ePayco validation for ${ref} had no x_cust_id_cliente — recorded without account check`);

  const paymentStatus = EPAYCO_STATUS[Number(data.x_cod_response)] || 'pending';
  const name = [data.x_customer_name, data.x_customer_lastname].filter(Boolean).join(' ');
  const order = await CrmOrderModel.findOneAndUpdate(
    { clientSlug, refPayco: String(data.x_ref_payco) },
    {
      $set: {
        transactionId: String(data.x_transaction_id || ''),
        invoice: String(data.x_id_invoice || ''),
        paymentStatus,
        amount: Number(data.x_amount) || 0,
        currency: String(data.x_currency_code || ''),
        description: String(data.x_description || '').slice(0, 300),
        paymentMethod: String(data.x_franchise || data.x_bank_name || ''),
        transactionDate: String(data.x_transaction_date || ''),
        testMode: String(data.x_test_request) === 'TRUE' || data.x_test_request === true,
        customer: {
          name,
          email: String(data.x_customer_email || ''),
          phone: String(data.x_customer_phone || data.x_customer_movil || ''),
          address: String(data.x_customer_address || ''),
          city: String(data.x_customer_city || ''),
          country: String(data.x_customer_country || ''),
          document: String(data.x_customer_document || ''),
        },
      },
      $setOnInsert: { clientSlug, refPayco: String(data.x_ref_payco), fulfillment: 'new' },
    },
    { new: true, upsert: true }
  ).lean();
  return { ok: true, order };
}

// Public: ePayco's confirmation call (GET or POST, form or JSON).
app.all('/api/crm/epayco/confirmation/:slug', async (req, res) => {
  try {
    const ref = (req.body && (req.body.x_ref_payco || req.body.ref_payco)) || req.query.x_ref_payco || req.query.ref_payco;
    const result = await recordEpaycoOrder(req.params.slug, ref);
    if (!result.ok) console.warn('ePayco confirmation not recorded', req.params.slug, ref, result.message);
  } catch (error) {
    console.error('ePayco confirmation failed', error);
  }
  // Always 200 so ePayco doesn't keep retrying a reference we've handled.
  res.status(200).send('ok');
});

// Public: the site's /order-complete page reports what the buyer paid —
// returns only the payment status, never customer details.
app.post('/api/crm/clients/:slug/orders/confirm', async (req, res) => {
  try {
    const result = await recordEpaycoOrder(req.params.slug, req.body.refPayco);
    if (!result.ok) return res.status(result.status).json({ ok: false, message: result.message });
    const { paymentStatus, amount, currency, description } = result.order;
    res.json({ ok: true, paymentStatus, amount, currency, description });
  } catch (error) {
    console.error('Order confirm failed', error);
    res.status(500).json({ ok: false, message: 'Could not check the payment.' });
  }
});

app.get('/api/crm/clients/:slug/orders', requireClientAdminPassword, async (req, res) => {
  try {
    const { CrmOrderModel } = await ensureModels();
    const orders = await CrmOrderModel.find({ clientSlug: req.params.slug }).sort({ createdAt: -1 }).limit(1000).lean();
    res.json({ ok: true, orders });
  } catch (error) {
    console.error('Could not load orders', error);
    res.status(500).json({ ok: false, message: 'Could not load orders.' });
  }
});

// Admin: add an order by its ePayco reference (e.g. if the confirmation
// call never arrived).
app.post('/api/crm/clients/:slug/orders/import', requireClientAdminPassword, async (req, res) => {
  try {
    const result = await recordEpaycoOrder(req.params.slug, req.body.refPayco);
    if (!result.ok) return res.status(result.status).json({ ok: false, message: result.message });
    res.json({ ok: true, order: result.order });
  } catch (error) {
    console.error('Order import failed', error);
    res.status(500).json({ ok: false, message: 'Could not import the order.' });
  }
});

const escapeHtml = (value) =>
  String(value || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Admin: update fulfillment — Shipped (with carrier/tracking), Delivered,
// Cancelled, notes. Marking shipped with notifyCustomer emails the buyer.
app.patch('/api/crm/clients/:slug/orders/:id', requireClientAdminPassword, async (req, res) => {
  try {
    const { CrmOrderModel, CrmClientModel } = await ensureModels();
    const order = await CrmOrderModel.findOne({ _id: req.params.id, clientSlug: req.params.slug });
    if (!order) return res.status(404).json({ ok: false, message: 'Order not found.' });

    const { fulfillment, carrier, trackingNumber, notes, notifyCustomer } = req.body;
    if (fulfillment !== undefined) {
      if (!['new', 'shipped', 'delivered', 'cancelled'].includes(fulfillment)) {
        return res.status(400).json({ ok: false, message: 'Invalid status.' });
      }
      if (fulfillment === 'shipped' && order.fulfillment !== 'shipped') order.shippedAt = new Date();
      if (fulfillment === 'delivered' && order.fulfillment !== 'delivered') order.deliveredAt = new Date();
      order.fulfillment = fulfillment;
    }
    if (carrier !== undefined) order.carrier = String(carrier).slice(0, 80);
    if (trackingNumber !== undefined) order.trackingNumber = String(trackingNumber).slice(0, 120);
    if (notes !== undefined) order.notes = String(notes).slice(0, 2000);

    let emailResult = null;
    if (notifyCustomer && order.fulfillment === 'shipped' && order.customer?.email) {
      const client = await CrmClientModel.findOne({ slug: req.params.slug }).lean();
      const clientName = client?.name || req.params.slug;
      const tracking = order.trackingNumber
        ? `<p style="margin:0 0 12px;color:#444;">${order.carrier ? `${escapeHtml(order.carrier)} tracking number` : 'Tracking number'}: <strong>${escapeHtml(order.trackingNumber)}</strong></p>`
        : '';
      emailResult = await sendCrmCampaignEmail({
        to: order.customer.email,
        name: order.customer.name,
        clientName,
        subject: `Your ${clientName} order has shipped`,
        replyTo: client?.contactEmail || '',
        html: `<div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
          <p style="margin:0 0 12px;color:#444;">Hi (name),</p>
          <p style="margin:0 0 12px;color:#444;">Good news — your order${order.description ? ` (${escapeHtml(order.description)})` : ''} is on its way.</p>
          ${tracking}
          <p style="margin:0 0 12px;color:#444;">Order reference: ${escapeHtml(order.refPayco)}</p>
          <p style="margin:24px 0 0;color:#333;font-weight:bold;">${escapeHtml(clientName)}</p>
        </div>`,
      });
      if (emailResult.ok) order.shippedEmailSentAt = new Date();
    }

    await order.save();
    res.json({ ok: true, order: order.toObject(), email: emailResult });
  } catch (error) {
    console.error('Could not update order', error);
    res.status(500).json({ ok: false, message: 'Could not update the order.' });
  }
});

module.exports = app;
module.exports.handler = serverless(app);