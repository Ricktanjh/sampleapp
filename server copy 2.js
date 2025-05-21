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


// ---------------------- ROUTES ----------------------

// Landing Page (index.ejs)
app.get('/', function (req, res) {
  res.render('pages/index');
});

// POST route to save mood
app.post('/logmood', async (req, res) => {
  const mood = req.body.mood || 'Neutral';

  try {
    await prisma.moodLog.create({ data: { mood } });
    res.redirect('/moodtracker');
  } catch (error) {
    console.error("Failed to log mood:", error);
    res.redirect('/');
  }
});

// GET route to show mood chart and latest mood
app.get('/moodtracker', async (req, res) => {
  try {
    const logs = await prisma.moodLog.findMany({
      orderBy: { createdAt: 'asc' }
    });

    res.render('pages/moodtracker', { logs });
  } catch (error) {
    console.error("Error loading mood tracker:", error);
    res.render('pages/moodtracker', { logs: [] });
  }
});

// Video Page
app.get('/video', function (req, res) {
  res.render('pages/video');
});

// Support Page
app.get('/support', function (req, res) {
  res.render('pages/support');
});

// Toolkits Page
app.get('/toolkits', function (req, res) {
  res.render('pages/toolkits');
});

// Journal Page
app.get('/journal', async function (req, res) {
  try {
    const blogs = await prisma.post.findMany({
      orderBy: [{ id: 'desc' }]
    });
    res.render('pages/journal', { blogs });
  } catch (error) {
    console.error(error);
    res.render('pages/journal', { blogs: [] });
  }
});

// Create Journal Entry
app.post('/new', async function (req, res) {
  try {
    const { content } = req.body;
    const title = new Date().toLocaleDateString();

    if (!content) {
      console.log("Content missing");
      return res.redirect('/journal');
    }

    await prisma.post.create({ data: { title, content } });
    res.redirect('/journal');
  } catch (error) {
    console.error(error);
    res.redirect('/journal');
  }
});

// Delete Journal Entry
app.post('/delete/:id', async (req, res) => {
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
