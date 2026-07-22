const mongoose = require('mongoose');
const userSchema = require('../user');
const enigmaUserSchema = require('../enigmaUser');
const { connectGenwavDb, connectEnigmaDb } = require('../connectdb');
const leadsRouter = require('../leads');
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
      'https://www.enigma-labs.com'
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

  return {
    UserModel,
    EnigmaUserModel,
    NewsletterSubscriberModel,
    OnboardingClientModel
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