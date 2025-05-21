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

// Landing Page (static)
app.get('/', function(req, res) {
    res.render('pages/index');
});

// Mood Tracker Page
app.get('/moodtracker', function(req, res) {
    res.render('pages/moodtracker');
});

// Video Page
app.get('/video', function(req, res) {
    res.render('pages/video');
});

// Support Page
app.get('/support', function(req, res) {
    res.render('pages/support');
});

// Toolkits Page
app.get('/toolkits', function(req, res) {
    res.render('pages/toolkits');
});

// Journal Page (dynamic - fetches from DB)
app.get('/journal', async function(req, res) {
    try {
        const blogs = await prisma.post.findMany({
            orderBy: [{ id: 'desc' }]
        });
        res.render('pages/journal', { blogs });
    } catch (error) {
        console.error(error);
        res.render('pages/journal', { blogs: [] }); // fallback
    }
});

// Handle form submission from journal.ejs
app.post('/new', async function(req, res) {
    try {
        const { content } = req.body;
        const title = new Date().toLocaleDateString(); // default title

        if (!content) {
            console.log("Content missing in journal entry");
            return res.redirect('/journal');
        }

        await prisma.post.create({
            data: { title, content }
        });

        res.redirect('/journal');
    } catch (error) {
        console.error(error);
        res.redirect('/journal');
    }
});

// Delete a journal entry by ID
app.post('/delete/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await prisma.post.delete({
            where: { id: parseInt(id) }
        });
        res.redirect('/journal');
    } catch (error) {
        console.error(error);
        res.redirect('/journal');
    }
});

// Optional: Weather Page (static or dynamic)
app.get('/weather', async (req, res) => {
    try {
        const response = await axios.get('https://api-open.data.gov.sg/v2/real-time/api/twenty-four-hr-forecast');
        res.render('pages/weather', { weather: response.data });
    } catch (error) {
        console.error(error);
        res.send('Error fetching weather data');
    }
});


// ---------------------- START SERVER ----------------------
app.listen(8080, () => {
    console.log("Server running on http://localhost:8080");
});
