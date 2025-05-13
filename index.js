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

        // Send the message to Dialogflow and handle the response
        sendToDialogflow(message)
          .then(dialogflowResponse => {
            // Send Dialogflow response back to the user
            sendTextMessage(senderId, dialogflowResponse);
          })
          .catch(error => {
            console.error('Error processing Dialogflow response:', error);
            sendTextMessage(senderId, "Sorry, something went wrong. Please try again later.");
          });
      });
    });
    res.sendStatus(200);
    return;
  }

  // ---------- 2. Dialogflow webhook ----------
  // If Dialogflow is configured to send a webhook back to the same endpoint,
  // you would handle its response here. However, if you only want to trigger
  // Dialogflow from Messenger and get the response back to Messenger, you
  // might not need to process a Dialogflow webhook here.
  res.sendStatus(200); // Acknowledge receipt of any POST request
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

// Function to send the user's message to Dialogflow and get a response
function sendToDialogflow(message) {
  return new Promise((resolve, reject) => {
    const dialogflowUrl = 'https://api.dialogflow.com/v1/query?v=20150910';
    const dialogflowToken = ''; // Removed the hardcoded token

    const body = {
      query: message,
      lang: 'en',
      sessionId: 'FACEBOOK_USER_' + Math.random().toString(36).substring(7) // Unique session ID per user
    };

    const headers = {
      'Content-Type': 'application/json'
    };

    // Conditionally add Authorization header if you have a token (though you said you don't want to ask for it)
    if (dialogflowToken) {
      headers['Authorization'] = `Bearer ${dialogflowToken}`;
    }

    request({
      url: dialogflowUrl,
      method: 'POST',
      headers: headers,
      json: body
    }, (error, response, body) => {
      if (error || response.statusCode !== 200) {
        reject(error || body);
      } else {
        const fulfillmentText = body?.result?.fulfillment?.speech; // Dialogflow response
        if (fulfillmentText) {
          resolve(fulfillmentText);
        } else {
          resolve("No response from Dialogflow.");
        }
      }
    });
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