const express = require('express');
const app = express();

app.use(express.json());

app.post('/webhook', (req, res) => {
  const parameters = req.body.queryResult.parameters;
  const room = parameters['room'];
  const device = parameters['device_type'];

  let response = '';

  if (room && device) {
    response = `Your ${device} in the ${room} has used about 2.1 kWh this week. That ${device} is running efficiently today.`;
  } else if (room) {
    response = `The ${room} has consumed approximately 5.6 kWh this week. Everything looks normal.`;
  } else if (device) {
    response = `Your ${device} has used approximately 1.2 kWh this week. No issues detected.`;
  } else {
    response = `I couldn’t find data for that room or device. Could you try specifying another?`;
  }

  res.json({ fulfillmentText: response });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook server is running on port ${PORT}`);
});
