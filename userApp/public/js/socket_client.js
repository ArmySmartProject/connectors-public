class SocketClient {

  constructor(userType, userId) {
    this.userType = userType;
    this.userId = userId;
    this.connected = false;
    this.myRooms = [];

    // todo: should 'roomId', 'bot' be multi value?
    this.roomId = '';
    this.bot = false;
    // {roomId: roomId, unreadMsgCnt: unreadMsgCnt}
    this.unreadMsgs = [];

    var socket = io.connect(serverURL, {transports: ['websocket']});
    // var socket = io.connect(serverURL + '/connectors');
    this.socket = socket;

    socket.once('connection', (data) => {
      if (data.type === 'connected') {
        this.connected = true;
      }
    });
  }
}

var socketClient = SocketClient.prototype;

// websocket 서버에서 event 응답 시 UI action을 정의
socketClient.setEventListeners = function (writeMessage,
    writeChatList = undefined,
    handleChatEndUI = undefined,
    writePreviousMessages = undefined) {
  this.socket.on('system', (data) => {
    writeMessage(data.roomId, 'system', data.talkObj);
  });

  this.socket.on('message', (data) => {
    console.log('message 도착');
    let talker = 'other';
    if (data.userId === this.userId) {
      talker = 'me';
    }
    writeMessage(data.roomId, talker, data.talkObj);
  });

  this.socket.on('getLastMsg', (data) => {
    console.log('getLastMsg 도착');

    let lastMsg = data.lastMsg;
    let unreadMsgCnt = data.unreadMsgCnt;

    let foundRoom = this.unreadMsgs.find(room => room.roomId === data.roomId);
    if (foundRoom) {
      foundRoom.unreadMsgCnt = unreadMsgCnt;
    } else {
      this.unreadMsgs.push({roomId: data.roomId, unreadMsgCnt: unreadMsgCnt});
    }

    writeMessage(data.roomId, '', lastMsg);
  });

  this.socket.on('getPreviousMsgs', (data) => {
    console.log('getPreviousMsgs 도착');
    this.roomId = data.roomId;

    let previousMsgs = data.previousMsg;
    if (writePreviousMessages) {
      writePreviousMessages(data.roomId, previousMsgs);
    }
  });

  // userType: supporter
  if (this.userType === 'supporter') {
    this.socket.on('getAvailableRooms', (data) => {
      console.log('getAvailableRoom 도착');

      this.socket.emit('getMyRooms', {
        userId: this.userId
      });
      writeChatList(data.rooms, 'av_rooms');
    });

    this.socket.on('getMyRooms', (data) => {
      console.log('getRoom 도착');
      this.myRooms = data.rooms;
      writeChatList(data.rooms, 'my_rooms');

      data.rooms.forEach(room => {
        this.joinRoom(room.roomId);
      });

    });
  }

  // userType: user
  if (this.userType === 'user') {
    this.socket.on('leaveRoom', (data) => {
      console.log('leaveRoom 도착');

      // 상담 종료 UI action
      if (handleChatEndUI) {
        handleChatEndUI();
      }

    });

    // 'end Conversation' event By Server
    this.socket.on('endConversation', (data) => {
      console.log('endConversation 도착');
      this.endChat(data.roomId);
    });
  }

  this.socket.on('err', function (data) {
    alert(data.message);
  });
};

socketClient.send2Server = function (roomId, msg) {
  console.log('send msg to server:', msg);
  this.socket.emit('message', {
    roomId: roomId,
    userType: this.userType,
    userId: this.userId,
    message: msg
  });
};

socketClient.getAvailableRooms = function () {
  this.socket.emit('getAvailableRooms', {
    userId: this.userId
  });
};

socketClient.transferToAgent = function () {
  this.socket.emit('transferToAgent', {
    userType: this.userType,
    userId: this.userId,
    roomId: this.roomId
  });

  this.bot = false;
};

socketClient.startChat = function (roomId) {
  this.socket.emit('startConversation', {
    userType: this.userType,
    userId: this.userId,
    roomId: roomId
  });
};

socketClient.endChat = function (roomId) {
  this.socket.emit('leaveRoom', {
    userType: this.userType,
    userId: this.userId,
    roomId: roomId
  });
};

// supporter 용
socketClient.endUserChat = function (roomId) {
  this.socket.emit('endConversation', {
    userType: this.userType,
    userId: this.userId,
    roomId: roomId
  });
};

socketClient.createRoom = function (csService, csCategory) {
  console.log('createRoom');
  this.socket.emit('createRoom',
      {
        userType: this.userType, userId: this.userId,
        csService: csService, csCategory: csCategory
      });

  return new Promise((resolve, reject) => {
    this.socket.once('createRoom', function (data) {
      console.log('createRoom 도착');
      resolve(data.roomId);
    });
  });

};

socketClient.joinRoom = function (roomId) {
  console.log('joinRoom');

  this.socket.emit('joinRoom',
      {roomId: roomId, userType: this.userType, userId: this.userId});

  return new Promise((resolve, reject) => {
    this.socket.once('joinRoom', (data) => {
      console.log('joinRoom 도착');
      this.roomId = data.roomId;
      resolve(data);
    });
  });
};

socketClient.createNJoinRoom = function (bot = false, csService, csCategory) {
  console.log('createNJoinRoom');
  this.socket.emit('createNJoinRoom',
      {
        userType: this.userType, userId: this.userId,
        bot: bot, csService: csService, csCategory: csCategory
      });

  return new Promise((resolve, reject) => {
    this.socket.once('createNJoinRoom', (data) => {
      console.log('createNJoinRoom 도착:' + data.roomId);
      this.roomId = data.roomId;
      this.bot = bot;
      resolve(data);
    });
  });
};

socketClient.getLastMsg = function (roomId) {
  console.log('getLastMsg, ' + roomId);
  this.socket.emit('getLastMsg',
      {roomId: roomId});
};

socketClient.getPreviousMsgs = function (roomId) {
  console.log('getPreviousMsgs: ' + roomId);
  this.socket.emit('getPreviousMsgs',
      {roomId: roomId});
};

socketClient.getMyRooms = function () {
  return this.myRooms;
};

// 일단 user쪽만 처리
socketClient.readAllMsgs = function (roomId) {
  if (this.userType !== 'user') {
    return;
  }
  console.log('readAllMsgs: ' + roomId);
  this.socket.emit('readAllMsgs',
      {roomId: roomId, userType: this.userType});
};