class ChatbotMonitorSocket {

  constructor(userType, userId) {
    this.userType = userType;
    this.userId = userId;
    this.connected = false;

    // todo: should 'roomId', 'bot' be multi value?
    this.roomId = '';
    this.bot = false;

    var socket = io.connect(serverURL + '/connectors/chatbot');
    this.socket = socket;

    socket.once('connection', (data) => {
      console.log('connected!!');
      if (data.type === 'connected') {
        this.connected = true;
      }
    });
  }
}

var chatbotMonitor = ChatbotMonitorSocket.prototype;

chatbotMonitor.setEventListeners = function (writeMessage, writeChatList) {
  this.socket.on('system', function (data) {
    writeMessage(this.roomId, 'system', data);
  });

  this.socket.on('message', function (data) {
    console.log('chatbot:getMsg!!');
    let talker = 'other';
    if (data.userId === this.userId) {
      talker = 'me';
    }
    writeMessage(data.roomId, talker, data.talkObj);
  });

    this.socket.on('getAvailableRooms', function (data) {
      console.log('getBotRoom 도착');
      writeChatList(data.rooms, 'bot_rooms');
    });
};

chatbotMonitor.getAvailableRooms = function() {
  this.socket.emit('getAvailableRooms', {
    userId: this.userId
  });
};