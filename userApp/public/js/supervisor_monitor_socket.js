class SupervisorMonitorSocket {

  constructor(userType, userId) {
    this.userType = userType;
    this.userId = userId;
    this.connected = false;

    // todo: should 'roomId', 'bot' be multi value?
    this.roomId = '';
    this.bot = false;

    var socket = io.connect(serverURL, { transports: ['websocket'] });
    this.socket = socket;

    console.log('socket client constructor');

    socket.once('connection', (data) => {
      console.log('connected!!');
      if (data.type === 'connected') {
        this.connected = true;
      }
    });
  }
}

var supervisorMonitor = SupervisorMonitorSocket.prototype;

supervisorMonitor.setEventListeners = function (writeMessage, writeChatList) {
  console.log('setEventListener');
  this.socket.on('system', function (data) {
    writeMessage('system', 'system', data.message);
  });

  this.socket.on('message', function (data) {
    console.log('getMsg!!');
    writeMessage('other', data.userId, data.message);
  });

    this.socket.on('getAvailableRooms', function (data) {
      console.log('getAvailableRoom 도착');
      writeChatList(data.rooms);
    });
};

supervisorMonitor.getAvailableRooms = function() {
  this.socket.emit('getAvailableRooms', {

    userId: this.userId
  });
};