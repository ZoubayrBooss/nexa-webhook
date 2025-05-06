app.post('/webhook', (req, res) => {
    const parameters = req.body.queryResult.parameters;
    const intent = req.body.queryResult.intent.displayName;
  
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
    }
  
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
  
    res.json({ fulfillmentText: response });
  });
  