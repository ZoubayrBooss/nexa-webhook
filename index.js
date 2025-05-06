const express = require('express');
const bodyParser = require('body-parser');

// Initialize the app
const app = express();

// Use bodyParser to parse incoming JSON data
app.use(bodyParser.json());

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
