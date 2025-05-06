app.post('/webhook', (req, res) => {
    const parameters = req.body.queryResult.parameters;
    const room = parameters['room'];
    const device = parameters['device_type'];
  
    let response = '';
  
    if (room && device) {
      // Respond with device + room energy usage
      response = `Your ${device} in the ${room} has used about 2.1 kWh this week. That ${device} is running efficiently today.`;
    } else if (room) {
      // Respond with room-only usage
      response = `The ${room} has consumed approximately 5.6 kWh this week. Everything looks normal.`;
    } else if (device) {
      // Respond with device-only usage
      response = `Your ${device} has used approximately 1.2 kWh this week. No issues detected.`;
    } else {
      // Neither room nor device provided
      response = `I couldn’t find data for that room or device. Could you try specifying another?`;
    }
  
    return res.json({
      fulfillmentText: response
    });
  });
  