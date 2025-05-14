const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const axios = require('axios');
let simulationData = {};

const app = express();
app.use(bodyParser.json());

const PAGE_ACCESS_TOKEN = 'EAAJnNHZAdC1kBO5dNG5cgAs76bDSHqbjlpoACZBZC9HavCexnX1RUnNoGvI1ZA7TsoAa2ujfGwf9HGqos6uVuZCJQ1JfEP0VqDm360gmQygDRo4g7i6ZAQDnMiORXm1UvTWiTlSoVG5gBE937x0Vv7uraP97wPNh1LA5zVWqgKgcD4YOZAMyr4B53HMzlJYZAIrX5wZDZD'; // Secure this in production

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

// POST webhook (Messenger & Dialogflow)
app.post('/webhook', async (req, res) => {
  // ---------- 1. Facebook Messenger ----------
  if (req.body.object === 'page') {
    req.body.entry.forEach(entry => {
      const messagingEvents = entry.messaging || [];
      messagingEvents.forEach(event => {
        const senderId = event.sender?.id;
        const message = event.message?.text;

        const isFromPage = event.sender && event.sender.id === entry.id;
        if (!message || isFromPage) return;

        console.log(`[FB] Message from ${senderId}: ${message}`);
        const staticResponse = "This feature is no longer freely available, thanks Google Cloud.";
        sendTextMessage(senderId, staticResponse);
      });
    });

    return res.sendStatus(200);
  }
  ///Getting info from the simul
app.post('/simulation', (req, res) => {
  const payload = req.body;

  // Store or update latest simulation data
  simulationData = payload;

  console.log("📡 Simulation data received:");
  console.log(JSON.stringify(payload, null, 2));

  res.sendStatus(200);
});

  // ---------- 2. Dialogflow Fulfillment ----------
const parameters = req.body.queryResult?.parameters || {};
const intentName = req.body.queryResult?.intent?.displayName || '';
const intent = intentName.toLowerCase().replace(/\s+/g, '_');
const room = parameters['room'];
const device = parameters['device_type'];

let responseText = '';

if (intent === 'report_status') {
  try {
    const simResponse = await axios.post('http://localhost:5000/simulate', {
      type: 'status',
      room,
      device,
    });

    if (!simResponse.data || !simResponse.data.response || !simResponse.data.response.data) {
      responseText = `I couldn’t find data for that room or device. Could you try specifying another?`;
    } else {
      const { room: resRoom, device: resDevice, usage, unit, devices } = simResponse.data.response.data;

      if (devices) {
        // Room-level report
        const deviceList = devices.map(d =>
          `${d.device} (${d.usage}${d.unit})`
        ).join(', ');
        responseText = `In the ${resRoom}, the devices are consuming: ${deviceList}.`;
      } else if (resRoom && resDevice && usage !== undefined) {
        // Device in room
        responseText = `The ${resDevice} in the ${resRoom} is currently using ${usage}${unit}.`;
      } else if (resDevice && usage !== undefined) {
        // Only device
        responseText = `The ${resDevice} is using about ${usage}${unit}.`;
      } else {
        responseText = `I couldn't determine the energy usage details.`;
      }
    }
  } catch (err) {
    console.error('❌ Error handling report_status:', err.message);
    responseText = `Something went wrong while checking the status. Please try again later.`;
  }
} else if (intent === 'suggest_improvement') {
  try {
    const simResponse = await axios.post('http://localhost:5000/simulate', {
      type: 'all'
    });

    const simulationData = simResponse.data?.response?.data; // Ensure this is safe
    if (!simulationData || !simulationData.rooms) {
      responseText = "I don't have the latest energy data yet.";
    } else {
      const allDevices = [];
      Object.entries(simulationData.rooms).forEach(([roomName, devices]) => {
        devices.forEach(device => allDevices.push({ room: roomName, ...device }));
      });

      const highest = allDevices
        .filter(d => d.state === 'on')
        .sort((a, b) => b.power - a.power)[0];

      if (highest) {
        const { device: topDevice, room: resRoom, power: usage } = highest;
        responseText = `Your highest consuming active device is the ${topDevice} in the ${resRoom}, using ${usage} watts.`;

        // Normalize device names and match tips
        const deviceTips = {
          'heater': `Consider lowering the thermostat or using it only when absolutely needed.`,
          'tv': `Turn off the TV when not watching or switch to energy-saving mode.`,
          'light': `Turn off the lights when leaving the ${resRoom || 'room'} or use motion sensors.`,
          'fridge': `Ensure the fridge door seals are tight and don't overload it.`,
          'air_conditioner': `Close doors and windows while it’s running, and keep filters clean.`,
          'computer': `Shut it down when not in use or enable sleep mode.`,
          'charger': `Unplug chargers when not charging to avoid phantom loads.`,
        };

        const tipKey = Object.keys(deviceTips).find(k => topDevice.toLowerCase().includes(k));
        const tip = deviceTips[tipKey] || `Try turning off or unplugging idle devices when not in use.`;
        responseText += ` ${tip}`;
      } else {
        responseText = "All devices are currently off or consuming minimal power.";
      }
    }
  } catch (err) {
    console.error('❌ Error during improvement suggestion:', err.message);
    responseText = `I couldn’t generate improvement suggestions right now. Please try again shortly.`;
  }
}


  res.json({ fulfillmentText: responseText });
});

// Send static text back to Messenger
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

// Fetch data from your Python simulation
async function fetchFromPythonSimulation(type, room, device) {
  try {
    const res = await axios.post('http://localhost:5000/simulate', {
      type, room, device
    }, { timeout: 5000 });  // Timeout after 5 seconds
    return res.data.response;
  } catch (err) {
    console.error('❌ Error fetching from simulation:', err.message);
    return null;
  }
}


// Start server
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`🚀 Nexa server running on port ${port}`);
});

// Crash handling
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
  console.error(err.stack);
});
