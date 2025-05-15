const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const PAGE_ACCESS_TOKEN = 'EAAJnNHZAdC1kBO5dNG5cgAs76bDSHqbjlpoACZBZC9HavCexnX1RUnNoGvI1ZA7TsoAa2ujfGwf9HGqos6uVuZCJQ1JfEP0VqDm360gmQygDRo4g7i6ZAQDnMiORXm1UvTWiTlSoVG5gBE937x0Vv7uraP97wPNh1LA5zVWqgKgcD4YOZAMyr4B53HMzlJYZAIrX5wZDZD'; // Secure this in production
let simulationData = {}; // global or module-scoped variable to hold latest simulation data
setInterval(() => {
  axios.get("https://your-python-render-url.com/ping").catch(() => {});
}, 5 * 60 * 1000); // every 5 minutes

app.post('/simulation', (req, res) => {
  simulationData = req.body;
  console.log('📡 Simulation data received:', simulationData);
  res.status(200).json({ message: 'Data received successfully' });
});

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

  // ---------- 2. Dialogflow Fulfillment ----------
  const parameters = req.body.queryResult?.parameters || {};
  const intentName = req.body.queryResult?.intent?.displayName || '';
  const intent = intentName.toLowerCase().replace(/\s+/g, '_');
  const room = parameters['room'];
  const device = parameters['device_type'];
  let responseText = '';

  if (intent === 'report_status') {
    try {
      const simResponse = await axios.post('http://localhost:5000/simulation', {
        type: 'status',
        room,
        device,
      },{ timeout: 30000 });

      if (!simResponse.data || !simResponse.data.response || !simResponse.data.response.data) {
        responseText = `I couldn’t find data for that room or device. Could you try specifying another?`;
      } else {
        const { room: resRoom, device: resDevice, usage, unit, devices } = simResponse.data.response.data;

        if (devices) {
          const deviceList = devices.map(d =>
            `${d.device} (${d.usage}${d.unit})`
          ).join(', ');
          responseText = `In the ${resRoom}, the devices are consuming: ${deviceList}.`;
        } else if (resRoom && resDevice && usage !== undefined) {
          responseText = `The ${resDevice} in the ${resRoom} is currently using ${usage}${unit}.`;
        } else if (resDevice && usage !== undefined) {
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
      const simResponse = await axios.post('http://localhost:5000/simulation', {
        type: 'all'
      });

      const simulationData = simResponse.data;

      if (!simulationData || !simulationData.rooms) {
        responseText = "I don't have the latest energy data yet.";
      } else {
        const anomalyRate = simulationData.anomaly_rate ?? 0;
        const recommendations = simulationData.energy_saving_recommendations ?? [];

        if (anomalyRate > 0.02) {
          const percent = (anomalyRate * 100).toFixed(2);
          responseText = `⚠️ I detected an anomaly rate of ${percent}%, which is above normal. There might be a device malfunction or irregular energy consumption. Please check your devices.`;
        } else if (recommendations.length > 0) {
          responseText = "Here are some energy saving suggestions for you:\n";
          responseText += recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n');
        } else {
          responseText = "All devices are operating normally with no significant anomalies detected.";
        }
      }
    } catch (err) {
      console.error('❌ Error during improvement suggestion:', err.message);
      responseText = `I couldn’t generate improvement suggestions right now. Please try again shortly.`;
    }

  } else if (intent === 'general_tips') {
    const tips = [
      "Unplug chargers and electronics when they're not in use.",
      "Use LED bulbs instead of incandescent ones.",
      "Take advantage of natural daylight when possible.",
      "Set your thermostat a few degrees lower in winter and higher in summer.",
      "Use smart power strips to reduce phantom loads.",
      "Clean your refrigerator coils regularly to improve efficiency.",
      "Do laundry with full loads and cold water.",
      "Install low-flow showerheads to reduce water heating costs.",
      "Turn off lights when leaving a room.",
      "Keep your HVAC filters clean for better airflow and efficiency."
    ];
    const randomIndex = Math.floor(Math.random() * tips.length);
    responseText = `💡 Energy-saving tip: ${tips[randomIndex]}`;

  } else if (intent === 'device_info') {
    const deviceConsumption = {
      "light": { usage: 0.06, unit: "kWh", note: "for an LED bulb" },
      "fan": { usage: 0.075, unit: "kWh", note: "for a standard ceiling fan" },
      "air conditioner": { usage: 1.2, unit: "kWh", note: "for a 1.5-ton AC" },
      "heater": { usage: 1.5, unit: "kWh", note: "for a room heater" },
      "refrigerator": { usage: 0.15, unit: "kWh", note: "for a medium-sized fridge" },
      "tv": { usage: 0.1, unit: "kWh", note: "for a modern LED TV" },
      "washing machine": { usage: 0.5, unit: "kWh", note: "per wash cycle" },
      "microwave": { usage: 1.0, unit: "kWh", note: "per hour of use" }
    };

    const lowerDevice = (device || '').toLowerCase();
    const data = deviceConsumption[lowerDevice];

    if (data) {
      responseText = `The ${device} typically uses about ${data.usage} ${data.unit} per hour — ${data.note}.`;
    } else {
      responseText = `I don’t have data for the "${device}" yet. Try asking about another common appliance.`;
    }

  } else {
    responseText = `Sorry, I didn't understand that request. Could you try rephrasing?`;
  }

  // ✅ Final response back to Dialogflow
  res.json({ fulfillmentText: responseText });
});

// Send static text back to Messenger
async function sendTextMessage(senderId, text) {
  try {
    const messageData = {
      recipient: { id: senderId },
      message: { text: text },
    };
    const url = `https://graph.facebook.com/v13.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
    await axios.post(url, messageData);
    console.log(`✅ Message sent to ${senderId}: "${text}"`);
  } catch (error) {
    console.error('❌ Error sending message:', error.response?.data || error.message);
  }
}


// Fetch data from your Python simulation
async function fetchFromPythonSimulation(type, room, device) {
  try {
    const res = await axios.post('http://localhost:5000/simulation', {
      type, room, device
    }, { timeout: 60000 });
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

// Global error handling
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
  console.error(err.stack);
});
