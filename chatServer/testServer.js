var WebSocketServer = require('ws').Server;

var wss = new WebSocketServer({port: 3100});

wss.on('connection', (ws) => {
  console.log('connection');
  ws.on('message', (message) => {
    let sendData = {event: 'res', data: null};
    message = JSON.parse(message);
    switch (message.event) {
      case 'open':
        console.log("Received: %s", message.event);
        break;
      case "req":
        sendData.data = message.data;
        ws.send(JSON.stringify(sendData));
        break;
      default:
    }
  });
});