const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');

const app = express();
app.use(bodyParser.json());

const PAGE_ACCESS_TOKEN = 'EAAJnNHZAdC1kBO5dNG5cgAs76bDSHqbjlpoACZBZC9HavCexnX1RUnNoGvI1ZA7TsoAa2ujfGwf9HGqos6uVuZCJQ1JfEP0VqDm360gmQygDRo4g7i6ZAQDnMiORXm1UvTWiTlSoVG5gBE937x0Vv7uraP97wPNh1LA5zVWqgKgcD4YOZAMyr4B53HMzlJYZAIrX5wZDZD'; 

// Facebook webhook verification
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = 'PFAOP';

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// POST webhook (Facebook + Dialogflow)
app.post('/webhook', (req, res) => {
  // ---------- 1. Facebook Messenger webhook ----------
  if (req.body.object === 'page') {
    req.body.entry.forEach(entry => {
      const messagingEvents = entry.messaging || [];
      messagingEvents.forEach(event => {
        const senderId = event.sender?.id;
        const message = event.message?.text;

        // ✅ Only respond to user messages (ignore messages sent by the page itself)
        const isFromPage = event.sender && event.sender.id === entry.id;
        if (!message || isFromPage) return;

        // Optionally log the message
        console.log(`[FB] Message from ${senderId}: ${message}`);

        // Respond
        sendTextMessage(senderId, `You said: ${message}`);
      });
    });
    res.sendStatus(200);
    return;
  }

  // ---------- 2. Dialogflow webhook ----------
  const parameters = req.body.queryResult?.parameters || {};
  const intentName = req.body.queryResult?.intent?.displayName || '';
  const intent = intentName.toLowerCase().replace(/\s+/g, '_');
  const room = parameters['room'];
  const device = parameters['device_type'];

  let response = '';

  if (intent === 'report_status') {
    if (room && device) {
      response = `Your ${device} in the ${room} has used about 2.1 kWh this week. That ${device} is running efficiently today.`;
    } else if (room) {
      response = `The ${room} has consumed approximately 5.6 kWh this week. Everything looks normal.`;
    } else if (device) {
      response = `Your ${device} has used approximately 1.2 kWh this week. No issues detected.`;
    } else {
      response = `I couldn’t find data for that room or device. Could you try specifying another?`;
    }
  } else if (intent === 'suggest_improvement') {
    if (room && device) {
      response = `To improve energy efficiency, try turning off the ${device} in the ${room} when not in use, and ensure it's well-maintained.`;
    } else if (device) {
      response = `For your ${device}, consider using a smart plug to schedule power cycles and reduce standby energy use.`;
    } else if (room) {
      response = `In the ${room}, switch to LED bulbs and unplug unused devices to save power.`;
    } else {
      response = `You can reduce waste by unplugging idle devices and switching to more efficient appliances.`;
    }
  } else if (intent === 'general_energy_tips') {
    const tips = [
      "Switch to LED lighting to reduce electricity use.",
      "Unplug devices when they’re not in use to avoid phantom loads.",
      "Use natural light during the day to cut lighting costs.",
      "Set your thermostat 1–2°C lower to save energy on heating.",
      "Do full laundry loads instead of multiple small ones.",
      "Switch to energy-efficient appliances for long-term savings."
    ];
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    response = `Here's a tip: ${randomTip}`;
  } else {
    response = "I'm not sure how to help with that yet, but I'm learning more every day!";
  }

  res.json({ fulfillmentText: response });
});

// Function to send a text message back to the user on Messenger
function sendTextMessage(senderId, text) {
  const messageData = {
    recipient: { id: senderId },
    message: { text: text },
  };

  request({
    url: 'https://graph.facebook.com/v13.0/me/messages',
    method: 'POST',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    json: messageData,
  }, (error, response, body) => {
    if (error) {
      console.error('❌ Error sending message:', error);
    } else if (response.body.error) {
      console.error('❌ Facebook response error:', response.body.error);
    } else {
      console.log(`✅ Message sent to ${senderId}: "${text}"`);
    }
  });
}

// Start the server
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`🚀 Nexa server running on port ${port}`);
});

// Catch unhandled exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  console.error(err.stack);
  process.exit(1);
});
