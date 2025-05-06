const express = require('express');
const bodyParser = require('body-parser');

// Initialize the app
const app = express();

// Use bodyParser to parse incoming JSON data
app.use(bodyParser.json());
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');

const app = express();
app.use(bodyParser.json());

const PAGE_ACCESS_TOKEN = 'your_page_access_token'; // Replace with your actual token

// Webhook verification endpoint (to verify Facebook webhook URL)
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = 'PFAOP'; // Replace with your own verification token

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// Handle messages sent to your bot
app.post('/webhook', (req, res) => {
  const body = req.body;

  // Make sure this is a page subscription
  if (body.object === 'page') {
    body.entry.forEach(entry => {
      const messaging = entry.messaging[0];
      const senderId = messaging.sender.id;
      const message = messaging.message.text;

      // Call your Dialogflow webhook to get a response
      // Send the response to the user using the Facebook API
      sendTextMessage(senderId, `You said: ${message}`);
    });
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// Function to send a text message back to the user
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
      console.log('Error sending message: ', error);
    } else if (response.body.error) {
      console.log('Error response body: ', response.body.error);
    }
  });
}

app.listen(5000, () => {
  console.log('Webhook server is running');
});

// Webhook handler
app.post('/webhook', (req, res) => {
  const parameters = req.body.queryResult.parameters;
  const intentName = req.body.queryResult.intent.displayName;

  // Normalize the intent name to lowercase with underscores
  const intent = intentName.toLowerCase().replace(/\s+/g, '_');

  const room = parameters['room'];
  const device = parameters['device_type'];

  let response = '';

  // Report status logic
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
  }

  // Suggest improvement logic
  else if (intent === 'suggest_improvement') {
    if (room && device) {
      response = `To improve energy efficiency, try turning off the ${device} in the ${room} when not in use, and ensure it's well-maintained.`;
    } else if (device) {
      response = `For your ${device}, consider using a smart plug to schedule power cycles and reduce standby energy use.`;
    } else if (room) {
      response = `In the ${room}, switch to LED bulbs and unplug unused devices to save power.`;
    } else {
      response = `You can reduce waste by unplugging idle devices and switching to more efficient appliances.`;
    }
  }

  // General energy tips logic
  else if (intent === 'general_energy_tips') {
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
  }

  // Fallback response if no matching intent is found
  else {
    response = "I'm not sure how to help with that yet, but I'm learning more every day!";
  }

  res.json({ fulfillmentText: response });
});

// Make sure the app listens on the correct port
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  console.error(err.stack);
  process.exit(1); // Exit the app if an uncaught error occurs
});
