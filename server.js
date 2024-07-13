const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cron = require('node-cron');
const axios = require('axios');
const nodemailer = require('nodemailer');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const User = require('./models/User');

dotenv.config();

const app = express();
app.use(express.json());
const cors = require('cors');
app.use(cors({
  origin: 'https://weather-app-frontend-alpha-blush.vercel.app/'
}));


mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

function generateWeatherPDF(user, weather) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    let buffers = [];
    
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      let pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });
    
    doc.on('error', reject);

    // Title
    doc.fontSize(20).text(`Weather Report for ${user.location}`, {
      align: 'center',
      underline: true
    });
    doc.moveDown();

    // User details
    doc.fontSize(12).text(`Email: ${user.email}`, { align: 'left' });
    doc.fontSize(12).text(`Date: ${new Date().toISOString().split('T')[0]}`, { align: 'left' });
    doc.moveDown();

    // Weather details
    doc.fontSize(16).text('Weather Details', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Description: ${weather.weather[0].description}`, { align: 'left' });
    doc.fontSize(12).text(`Temperature: ${(weather.main.temp - 273.15).toFixed(2)} °C`, { align: 'left' });
    doc.fontSize(12).text(`Feels Like: ${(weather.main.feels_like - 273.15).toFixed(2)} °C`, { align: 'left' });
    doc.fontSize(12).text(`Humidity: ${weather.main.humidity} %`, { align: 'left' });
    doc.fontSize(12).text(`Pressure: ${weather.main.pressure} hPa`, { align: 'left' });
    doc.fontSize(12).text(`Wind Speed: ${weather.wind.speed} m/s`, { align: 'left' });
    doc.fontSize(12).text(`Cloudiness: ${weather.clouds.all} %`, { align: 'left' });

    doc.end();
  });
}

async function sendWeatherEmail(user, weather) {
  try {
    const pdfData = await generateWeatherPDF(user, weather);
    
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: user.email,
      subject: 'Weather Report',
      text: `Hello,\n\nHere is your weather report for ${user.location}.\n\nRegards,\nWeather Report Service`,
      attachments: [
        {
          filename: 'WeatherReport.pdf',
          content: pdfData
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${user.email}`);
  } catch (error) {
    console.error(`Error sending email to ${user.email}: `, error);
  }
}

async function fetchAndStoreWeather(user) {
  try {
    const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${user.location}&appid=${process.env.OPENWEATHERMAP_API_KEY}`);
    const weather = response.data;
    const date = new Date().toISOString().split('T')[0];

    user.weatherData.push({ date, data: JSON.stringify(weather) });
    await user.save();

    await sendWeatherEmail(user, weather);
  } catch (error) {
    console.error(`Error fetching weather for ${user.email}: `, error);
  }
}

// Cron job to fetch and send weather data every 3 hours
cron.schedule('0 */3 * * *', async () => {
  console.log('Fetching and sending weather data...');
  const users = await User.find();
  users.forEach(user => fetchAndStoreWeather(user));
});

// Route to add a new user
app.post('/users', async (req, res) => {
  const { email, location } = req.body;
  try {
    const user = new User({ email, location });
    await user.save();
    res.status(201).send(user);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).send({ message: 'User with this email already exists' });
    } else {
      res.status(500).send({ message: 'Internal server error' });
    }
  }
});

// Route to update user's location
app.put('/users/:email', async (req, res) => {
  const { email } = req.params;
  const { location } = req.body;
  try {
    const user = await User.findOneAndUpdate({ email }, { location }, { new: true });
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }
    res.send(user);
  } catch (error) {
    res.status(500).send({ message: 'Internal server error' });
  }
});

// Route to get user's weather data for a given day
app.get('/users/:email/weather', async (req, res) => {
  const { email } = req.params;
  const { date } = req.query;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }
    const weatherData = user.weatherData.filter(data => data.date === date);
    res.send(weatherData);
  } catch (error) {
    res.status(500).send({ message: 'Internal server error' });
  }
});

// Route to send weather report to a registered user (manual trigger)
app.post('/send-weather-report', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }
    await fetchAndStoreWeather(user);
    res.send({ message: 'Weather report sent' });
  } catch (error) {
    res.status(500).send({ message: 'Internal server error' });
  }
});

// Test email route
app.get('/test-email', async (req, res) => {
  const testUser = {
    email: process.env.GMAIL_USER,
    location: 'Colombo'
  };
  const testWeather = {
    weather: [{ description: 'clear sky' }],
    main: { temp: 300.15 },
    wind: { speed: 5.14 },
    name: 'Colombo'
  };
  try {
    await sendWeatherEmail(testUser, testWeather);
    res.send('Test email sent');
  } catch (error) {
    res.status(500).send(`Error sending test email: ${error.message}`);
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
