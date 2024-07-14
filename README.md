# Weather Report Service

This is a Node.js application that provides weather reports to registered users via email every 3 hours. The application fetches weather data from the OpenWeatherMap API and sends it via email in both text and PDF formats.

## Features

- User registration with email and location
- Automatic weather report emails every 3 hours
- Manual trigger for sending weather reports
- Weather data stored in MongoDB
- PDF generation for weather reports

## Prerequisites

- Node.js (version 12 or higher)
- MongoDB
- An account with Gmail for sending emails
- OpenWeatherMap API key

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/shakeeb2001/Weather_App.git
   cd weather-report-service
