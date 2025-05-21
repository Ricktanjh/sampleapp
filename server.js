// Needed for dotenv
require("dotenv").config();

// Needed for Express
const express = require('express');
const app = express();
const axios = require('axios');

// Needed for EJS
app.set('view engine', 'ejs');

// Needed for public directory
app.use(express.static(__dirname + '/public'));

// Needed for parsing form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Needed for Prisma to connect to database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ----- Authentication & Sessions -----
const session       = require('express-session');
const PgSession     = require('connect-pg-simple')(session);
const passport      = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt        = require('bcrypt');
const { Pool } = require('pg');

// Secure pool for connect-pg-simple session store (with SSL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Session store in Postgres with auto table creation
app.use(session({
  store: new PgSession({ pool, tableName: 'session', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 1 week
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Make `user` available in all EJS templates
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

// Serialize & deserialize user
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Local strategy for username/password
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return done(null, false, { message: 'Incorrect username.' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return done(null, false, { message: 'Incorrect password.' });
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

// Protect routes
function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

// ----- Auth Routes -----
// Register
app.get('/register', (req, res) => {
  res.render('pages/register', { error: null });
});
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render('pages/register', { error: 'All fields required.' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.create({ data: { username, password: hash } });
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    res.render('pages/register', { error: 'Username already taken.' });
  }
});

// Login
app.get('/login', (req, res) => {
  res.render('pages/login', { error: req.query.error });
});
app.post('/login', passport.authenticate('local', {
  successRedirect: '/moodtracker',
  failureRedirect: '/login?error=true'
}));

// Logout
app.get('/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

// ----- Application Routes -----
// Landing Page
app.get('/', (req, res) => {
  res.render('pages/index');
});

// Save mood (authenticated)
app.post('/logmood', ensureAuth, async (req, res) => {
  const { mood } = req.body;
  try {
    await prisma.moodLog.create({ data: { mood, userId: req.user.id } });
    res.redirect('/moodtracker');
  } catch (error) {
    console.error("Failed to log mood:", error);
    res.redirect('/');
  }
});

// Mood tracker (authenticated)
app.get('/moodtracker', ensureAuth, async (req, res) => {
  try {
    const logs = await prisma.moodLog.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'asc' }
    });
    res.render('pages/moodtracker', { logs });
  } catch (error) {
    console.error(error);
    res.redirect('/');
  }
});

// Toolkits Page (public)
app.get('/toolkits', (req, res) => {
  res.render('pages/toolkits');
});

// Video Page (public)
app.get('/video', (req, res) => {
  res.render('pages/video');
});

// Support Page (public)
app.get('/support', (req, res) => {
  res.render('pages/support');
});

// Journal Page (authenticated)
app.get('/journal', ensureAuth, async (req, res) => {
  try {
    const blogs = await prisma.post.findMany({
      where: { userId: req.user.id },
      orderBy: [{ id: 'desc' }]
    });
    res.render('pages/journal', { blogs });
  } catch (error) {
    console.error(error);
    res.render('pages/journal', { blogs: [] });
  }
});

// Create Journal Entry (authenticated)
app.post('/new', ensureAuth, async (req, res) => {
  const { content } = req.body;
  const title = new Date().toLocaleDateString();
  try {
    if (!content) return res.redirect('/journal');
    await prisma.post.create({ data: { title, content, userId: req.user.id } });
    res.redirect('/journal');
  } catch (error) {
    console.error(error);
    res.redirect('/journal');
  }
});

// Delete Journal Entry (authenticated)
app.post('/journal/:id/delete', ensureAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.post.delete({ where: { id: parseInt(id) } });
    res.redirect('/journal');
  } catch (error) {
    console.error(error);
    res.redirect('/journal');
  }
});

// ---------------------- START SERVER ----------------------
app.listen(8080, () => {
  console.log("✅ Server running on http://localhost:8080");
});