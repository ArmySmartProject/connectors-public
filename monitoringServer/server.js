'use strict';
const http = require('http');
const path = require('path');

// development, production, test
const env = process.env.NODE_ENV || 'development';
const config = require(
    path.join(__dirname, '..', 'config', 'websocket-config.json'))[env];
const serverPort = config.monitoringServerPort;

/**
 * App.
 */
const app = http.createServer();

/**
 * App listen.
 */
app.listen(51000, function () {
  const addr = app.address();
  console.log('app listening on http://' + addr.address + ':' + addr.port);
});

const io = require('socket.io').listen(app);

io.sockets.on('connection', socket => {

  socket.emit('connection', {
    type : 'connected'
  });

  socket.on('connection', data => {
    console.log('[connection data] / ' + typeof(data));
    if (typeof(data) === 'string') {
      data = JSON.parse(data);
    }
    console.log(data);
    if(data.type === 'join') {
      socket.join(data.room);
      socket.room = data.room;
    }
  });

  socket.on('sendMsg', data => {
    console.log('[sendMsg data] / ' + typeof(data));
    if (typeof(data) === 'string') {
      data = JSON.parse(data);
    }
    console.log(data);
    var room = socket.room;
    if(room) {
      socket.broadcast.to(room).emit('message', data);
    }
  });
});
