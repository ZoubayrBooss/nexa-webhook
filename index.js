const express = require("express");
const bodyParser = require("body-parser");
const app = express();
app.use(bodyParser.json());

app.post("/webhook", (req, res) => {
  const parameters = req.body.queryResult.parameters;
  const room = parameters["room"];
  const device = parameters["device_type"];

  let responseText = "";

  if (room && device) {
    responseText = `The ${device} in the ${room} has consumed about 1.3 kWh today.`;
  } else if (room) {
    responseText = `Devices in the ${room} have used around 3.2 kWh today.`;
  } else if (device) {
    responseText = `Your ${device} has used approximately 0.8 kWh today.`;
  } else {
    responseText = `I'm not sure which room or device you meant. Could you specify one?`;
  }

  res.json({
    fulfillmentText: responseText,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Webhook running on port ${PORT}`));
