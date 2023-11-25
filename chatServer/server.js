'use strict';
const http = require('http');

const config_path = require('path');
const sds_env = process.env.NODE_ENV || 'development';
const sds_config = require(config_path.join(__dirname, '..', 'config', 'logger-config.json'))[sds_env];

const app = http.createServer();

const path = require('path');

// development, production, test
const env = process.env.NODE_ENV || 'development';
const config = require(
    path.join(__dirname, '..', 'config', 'websocket-config.json'))[env];
const serverPort = config.serverPort;
const query = require('./query');

var debug = require('debug')('chatserver:server');

console.log('NODE_ENV = ' + env);
console.log('DEBUG = ' + process.env.DEBUG);

/** HTTP: App listen. **/
app.listen(serverPort, function () {
  const addr = app.address();
  console.log('app listening on http://' + addr.address + ':' + addr.port);
});

const io = require('socket.io').listen(app);
/** HTTP **/


/** HTTP **/
// const io = require('socket.io').listen(serverPort);
/** HTTP **/

let room = {
  roomId: undefined,
  csService: undefined,
  csCategory: undefined,
  userId: undefined,
  supporterId: undefined,
  available: false,
  bot: false,
  status: undefined
};

let rooms = [];
let previousMsg = {};

// supervisor monitor namespace
// const supervisor = io.of('/supervisor');
// supervisor.on('connection', function (socket) {
//   debug('supervisor: someone connected');
//   supervisor.emit('message', {message: 'hi everyone!'});
//   supervisor.on('message', data => {
//     var room = socket.room;
//
//     if (room) {
//       socket.broadcast.to(room).emit('message', data);
//     }
//   });
// });
//

// chatbot monitor namespace
var chatbotMonitor = io.of('/connectors/chatbot');
chatbotMonitor.on('connection', function (socket) {
  debug('[IO.CONNECT] socket id:' + socket.id);
  socket.on('getRooms', data => {
    var room = socket.room;

    if (room) {
      socket.emit('getRooms', data);
    }
  });
});

var socketIdBySupporter = {};

var mapByBotId;
var mapByUserId;
var mappingBotAndCompany;

var cateMapByBotId;
var cateMapByUserId;

var chatSessionMapByRoomId = {};

const ALR_INTENT_TYPE_NAME = 'REQUEST';
const MNT_INTENT_TYPE_NAME = 'MONITOR';

query.getAllBotMappingInfos().then(result => {
  mapByBotId = result.mapByBotId;
  mapByUserId = result.mapByUserId;
  mappingBotAndCompany = result.mappingBotAndCompany;
  socketConnect();
});

query.getAllAlrIntMappingInfos().then(result => {
  cateMapByBotId = result.mapByBotId;
  cateMapByUserId = result.mapByUserId;
});


const socketConnect = () => {
  io.sockets.on('connection', function (socket) {
// wss.on('connection', function (socket) {

// let connectors = io.of('/connectors');
// connectors.on('connection', function(socket) {
    let maumSdsChatbot = new MaumSdsChatbot();

    // reconnect일 때 다른 작업
//    if (socket.conn.readyState === 'open') {
    debug('[IO.CONNECT] socket id:' + socket.id);
    // client.push({id: socket.client.id});
    // var getClientID = client.find(e => (e.id === socket.client.id));
    // if (getClientID) {
    //   //io.sockets.emit("msg",history);
    //   socket.emit("msg", history);
    //
    // }

    // server: client에 connect 된 것 확인시켜주기
    socket.emit('connection', {
      type: 'connected'
    });

    var createRoom = (data) => {
      let roomId = getUUID();
      debug('create room : ' + roomId);

      data.roomId = roomId;
      updateRoomStatus(data);
      previousMsg[roomId] = [];

      socket.emit('createRoom', {
        roomId: roomId
      });
    };

    var joinRoom = (data) => {
      var roomId = data.roomId;
      debug('[joinRoom] : SERVICE "' + data.csService + '", USER ID "' + data.userId + '"');

      let avRooms = rooms.filter((room) => {
//            return room.available === true
        return true;
      });

      let foundRoom = avRooms.find(room => room.roomId === roomId);

      if (roomId && foundRoom) {

        if (data.userType === 'supporter') {
          data['status'] = 'join';
          data['chatSessionLogId'] = chatSessionMapByRoomId[roomId];
          query.updateChatSessionLog(data);
        }

        // 현 supporterId로 이미 배정되어 있지 않으면
        if (data.userId !== foundRoom.supporterId) {
          socket.join(roomId, () => {
            debug('[joinRoom] (' + data.userType + ')' + data.userId + ' join a "' + roomId + '"');

            io.to(roomId).emit('joinRoom',
                {
                  userId: data.userId, roomId: roomId,
                  previousMsg: previousMsg[roomId]
                });

            if (data.userType === 'supporter') {

              let lastMsg = getLastElement(previousMsg[roomId]);
              if (lastMsg && lastMsg.message && lastMsg.message === SM_WAIT_FOR_AGENT) {
                previousMsg[roomId].pop();
              }
              // let msg = `상담사 [${data.userId}]가 배정되었습니다.`;
              sendSystemMsg(roomId, SM_AGENT_CONNECTED);

            }
          });

          updateRoomStatus(data);

          // 현 supporterId로 이미 배정되어 있으면 join & emit 만 날려
        } else {
          socket.join(roomId, () => {

            io.to(roomId).emit('joinRoom',
                {
                  userId: data.userId, roomId: roomId,
                  previousMsg: previousMsg[roomId]
                });
          });
        }
      } else {
        debug('Room Id is Not Valid');
        socket.emit('err', {message: 'Cannot enter room'});
      }
    };

    var createNJoinRoom = (data) => {
      debug('[createNJoinRoom] : SERVICE "' + data.csService + '", USER ID "' + data.userId + '"');

      // let roomId = getUUID();
      // debug('create room : ' + roomId);

      let roomId = createRoomID(data.userId, data.csService);

      let foundRoom = rooms.find(room => room.roomId === roomId);
      if (!foundRoom && data.userType === 'supporter') {
        debug(data.userId + ': Cannot join a closed room.');
        return;
      }

      data.roomId = roomId;
      updateRoomStatus(data);

      socket.join(roomId, () => {
        debug('[CREATE & JOIN Room] ('
            + data.userType + ') join a "' + roomId + '"');
        io.to(roomId).emit('createNJoinRoom',
            {
              roomId: roomId,
              userId: data.userId,
              csService: data.csService,
              csCategory: data.csCategory,
              previousMsg: previousMsg[roomId]
            });

        if (data.userType === 'supporter') {
          let lastMsg = getLastElement(previousMsg[roomId]);
          if (lastMsg && lastMsg.message && lastMsg.message === SM_WAIT_FOR_AGENT) {
            previousMsg[roomId].remove(lastMsg);
          }
          // let msg = `상담사 [${data.userId}]가 배정되었습니다.`;
          sendSystemMsg(roomId, SM_AGENT_CONNECTED);
        }
      });
    };

    var getLastElement = (list) => {
      if (list && list.length > 0) {
        return list[list.length - 1];
      }
    };

    var getLastMsg = (data) => {
      debug('[getLastMsg] ' + data.roomId);

      let roomId = data.roomId;

      let unreadMsgCnt = 0;
      let lastMsg = {message: '', time: ''};
      let previousMsgs = previousMsg[roomId];

      if (getLastElement(previousMsgs)) {
        lastMsg = getLastElement(previousMsgs);
        unreadMsgCnt = previousMsgs.filter(
            talkObj => talkObj.unreadUser !== 0).length;
      } else if (!previousMsgs) {
        debug('[getLastMsg] No Available room: ' + roomId);
        return;
      }

      socket.emit('getLastMsg',
          {roomId: roomId, lastMsg: lastMsg, unreadMsgCnt: unreadMsgCnt});

    };

    var readAllMsgs = (data) => {
      debug('[readAllMsgs] ' + data.userType);

      let roomId = data.roomId;

      let lastMsg = {message: '', time: '', unreadUser: 0};
      let previousMsgs = previousMsg[roomId];
      if (previousMsgs && data.userType === 'user') {
        previousMsgs.forEach(talkObj => {
          talkObj.unreadUser = 0;
        });
      }

      socket.to(roomId).emit('getLastMsg',
          {roomId: roomId, lastMsg: lastMsg, unreadMsgCnt: 0});

    };

    var getPreviousMsgs = (data) => {
      // debug('[getPreviousMsgs] ' + data.roomId);

      let roomId = data.roomId;

      socket.emit('getPreviousMsgs',
          {roomId: roomId, previousMsg: previousMsg[roomId]});

    };

    var startConversation = function (data) {
      debug('[startConversation] roomId : ' + data.roomId);

      let roomId = data.roomId;
      let foundRoom = rooms.find(room => room.roomId === roomId);

      sendSystemMsg(roomId, SM_BEGIN_CONVERSATION);

      if (foundRoom.bot) {
        // chatbot.sendMessage(socket, roomId, '처음으로');
        maumSdsChatbot.sendMessage(roomId,
            {type: "intent", input: "처음으로", host: 74, lang: 2});
      } else {
        // let talkObj = {
        //   userType: 'supporter', message: '안녕하세요! 무엇을 도와드릴까요?',
        //   date: getDate(), time: getTime(), timeDetail: getTimeWithSecond(),
        //   unreadUser: 0, unreadSupporter: 0
        // };
        let talkObj = {
          userType: 'supporter', message: 'Hello! May I help you?',
          date: getDate(), time: getTime(), timeDetail: getTimeWithSecond(),
          unreadUser: 0, unreadSupporter: 0
        };
        previousMsg[roomId].push(talkObj);

        data.talkObj = talkObj;
        socket.to(roomId).emit('message', data);

      }
    };

    var endConversation = function (data) {
      debug('[endConversation] roomId : ' + data.roomId);
      let roomId = data.roomId;
      socket.broadcast.to(roomId).emit('endConversation', {roomId: roomId});
      socket.leave(roomId, function () {
        debug('(' + data.userType + ')' + data.userId + ' leaves a [' + roomId
            + ']');
        let foundRoom = rooms.find(room => room.roomId === roomId);
        if (data.userType === 'supporter' && foundRoom.status !== 'end') {

          sendSystemMsg(roomId, SM_END_CONVERSATION);
        }
        updateRoomStatus(data, false, true);
        data['status'] = 'end';
        data['chatSessionLogId'] = chatSessionMapByRoomId[data.roomId];
        query.updateChatSessionLog(data);
        updateCounselorsCnt(data.userId);
        delete chatSessionMapByRoomId[data.roomId];
      })
    };

    var leaveRoom = function (data) {
      debug('[LEAVE Room] roomId : ' + data.roomId);
      let roomId = data.roomId;
      socket.leave(roomId, function () {
        debug('(' + data.userType + ')' + data.userId + ' leaves a [' + roomId
            + ']');

        socket.emit('leaveRoom', {roomId: roomId});

        let foundRoom = rooms.find(room => room.roomId === roomId);
        // 이미 leave 상태여서 broadcast 처럼 작동
        if (data.userType === 'user' && foundRoom.status !== 'end') {
          sendSystemMsg(roomId, SM_END_CONVERSATION);
        }
        updateRoomStatus(data, false, true);
      });
    };

    var getAvailableRooms = (data) => {
      debug('[getAvailableRooms] request by supporter.');

      data.userType = 'supporter';
      // todo: 인증시스템
      socketIdBySupporter[data.userId] = socket.id;
      debug('[socketId By Supporters] :');
      debug(socketIdBySupporter);

      sendAvailableRooms(data);
    };

    var getMyRooms = (data) => {
      let myRooms = rooms.filter((room) => {
        return room.supporterId === data.userId && room.status !== 'end'
      });
      debug('[getMyRooms] ' + data.userId + ' `s length:' + myRooms.length);
      socket.emit('getMyRooms', {rooms: myRooms});
    };

    var message = data => {

      debug('[message] : SERVICE "' + data.csService + '", MSG "' + data.message + '"');

      var roomId = data.roomId;
      if (!roomId) {
        debug('[message] No room id!');
        return;
      }

      if (chatSessionMapByRoomId.hasOwnProperty(roomId)) {
        data['chatSessionLogId'] = chatSessionMapByRoomId[roomId];
        query.insertChatLog(data);
      }

      let foundRoom = rooms.find(room => room.roomId === roomId);
      if (!foundRoom) {
        debug('[message] Cannot find room! : ' + roomId);
        // rooms에서 사라진 room도 msg가 오면 활성화 (반영 시 발생)
        if (data.csService) {
          updateRoomStatus(data);
          socket.join(roomId);
          foundRoom = rooms.find(room => room.roomId === roomId);
        } else {
          return;
        }
      } else if (foundRoom.status === 'end') {
        debug('[message] Already closed room! : ' + roomId);
        // 종료 처리된 room도 msg가 오면 활성화
        if (data.csService) {
          updateRoomStatus(data);
          socket.join(roomId);
        }
      }

      let unreadUser = 1;
      let unreadSupporter = 1;
      if (data.userType === 'user') {
        unreadUser = 0;
      } else if (data.userType === 'supporter') {
        unreadSupporter = 0;
      }
      // query.insertHistory(req);

      // 'supporter', '무엇을 도와드릴까요?', '2020년 4월 20일 금요일', '13:25'
      let talkObj = {
        userType: data.userType,
        message: data.message,
        date: getDate(), time: getTime(), timeDetail: getTimeWithSecond(),
        unreadUser: unreadUser, unreadSupporter: unreadSupporter
      };
      previousMsg[roomId].push(talkObj);

      data.talkObj = talkObj;
      socket.broadcast.to(roomId).emit('message', data);

      if (foundRoom.bot) {
        // chatbotMonitor.emit('message', data);
        sendChatbotMonitoringChat(data);

        let adaptReq = data.meta.adapterRequest;

        if (!adaptReq) return;

        // '실시간상담' keyword match 여부
        // if (ifKeywordMatch(adaptReq.input, TRANSFER_TO_AGENT_KEYWORDS)) {
        //   transferToAgent(data);
        // } else {

        try {
          // chatbotbot 대화
          maumSdsChatbot.sendMessage(roomId, adaptReq);
        } catch (e) {
          transferToAgent(data);
        }

      }
      // else if (!foundRoom.bot && TRANSFER_TO_CHATBOT_KEYWORD.indexOf(data.message) > -1) {
      //   endConversation({'userType':'user', 'userId': data.userId, 'roomId': data.roomId});
      // }

      // todo: insert into chat_history
    };

    var enteringEvent = param => {

      let talkObj = {
        userType: 'supporter',
        date: getDate(), time: getTime(), timeDetail: getTimeWithSecond(),
        unreadUser: 1, unreadSupporter: 0
      };

      let data = {roomId: param.roomId, talkObj: talkObj};
      // to room
      io.to(param.roomId).emit('enteringEvent', data);
    };

    var bluringEvent = param => {

      let talkObj = {
        userType: 'supporter',
        date: getDate(), time: getTime(), timeDetail: getTimeWithSecond(),
        unreadUser: 1, unreadSupporter: 0
      };

      let data = {roomId: param.roomId, talkObj: talkObj};
      // to room
      io.to(param.roomId).emit('bluringEvent', data);
    };

    var ifKeywordMatch = (target, rules) => {
      let keywordMatched = false;

      if (!target) return keywordMatched;

      for (let i in rules) {
        let rule = rules[i];
        if (target.includes(rule)) {
          debug('[message] KEYWORD match! : ' + rule);
          keywordMatched = true;
          break;
        }
      }

      return keywordMatched;
    };

    // socket.on('disconnect', () => {
    //     console.log('user disconnected');
    // });
    // user의 새 채팅방 생성 요청
    socket.on('createRoom', createRoom);
    // join room
    socket.on('joinRoom', joinRoom);
    // user의 새 채팅방 생성 요청
    socket.on('createNJoinRoom', createNJoinRoom);
    socket.on('getLastMsg', getLastMsg);
    socket.on('readAllMsgs', readAllMsgs);
    socket.on('readAllMsgs', readAllMsgs);
    socket.on('getPreviousMsgs', getPreviousMsgs);
    // connectors userapp용
    socket.on('startConversation', startConversation);
    // end command by supporter
    socket.on('endConversation', endConversation);
    // leave room
    socket.on('leaveRoom', leaveRoom);
    // supporter 별 문의 가능한 room list return
    socket.on('getAvailableRooms', getAvailableRooms);

    // My rooms return
    socket.on('getMyRooms', getMyRooms);

    socket.on('transferToAgent', transferToAgent);

    socket.on('message', message);

    socket.on('enteringEvent', enteringEvent);

    socket.on('bluringEvent', bluringEvent);
  });
}


var setCsCatetory = function(roomId, intent) {
  let foundRoom = rooms.find(room => room.roomId === roomId);
  foundRoom.csCategory = intent;
};

var sendSystemMsg = function(roomId, msg) {
  let talkObj = {
    userType: 'system', message: msg,
    date: getDate(), time: getTime(), timeDetail: getTimeWithSecond(),
    unreadUser: 0, unreadSupporter: 0
  };
  io.sockets.in(roomId).emit('system', {
    roomId: roomId,
    talkObj: talkObj
  });

  previousMsg[roomId].push(talkObj);
};

// BotMapping 테이블의 배정 룰을 따름
var sendAvailableRooms = (data) => {
  debug('[sendAvailableRooms]');
  if (!data.userType) {
    debug('[sendAvailableRooms] No user type.');
    return;
  }

  let aliveRooms = rooms.filter((room) => {
    return room.status !== 'end'
  });

  // get supporter list
  let supporterList = [];

  if (data.userType === 'user') {
    // csService에 mapping 되는 csService
    if (data.csService) {
      supporterList = mapByBotId[data.csService];
    } else if (data.roomId) {
      let foundRoom = aliveRooms.find(room => room.roomId === data.roomId);
      if (foundRoom && foundRoom.csService) {
        supporterList = mapByBotId[foundRoom.csService];
      }
    }

  } else if (data.userType === 'supporter') {
    if (data.userId) {
      supporterList = [data.userId];
    }
  }

  for (let i in supporterList) {
    let supporter = supporterList[i];

    let supporterSocketId = socketIdBySupporter[supporter];

    // 연결 중인 상담사가 없음.
    if (!supporterSocketId) {
      continue;
    }

    let svcList = mapByUserId[supporter];
    let cateList = cateMapByUserId[supporter];

    // 할당된 service가 없음 (bot_mapping)
    if (!svcList) {
      continue;
    }

    // chatbot 상담창(botRooms)과 상담 배정 안된 창(avRooms), 나의 대화창(myRooms)을 노출
    let assignRooms = aliveRooms.filter((room) => {
      return svcList.includes(room.csService);
    });
    //
    // let avRooms = assignRooms.filter((room) => {
    //   return room.available;
    // });

    let avRooms = aliveRooms.filter((room) => {
      return room.available &&
          (cateList.filter(cate => {
            return cate[0] == room.csService &&
            (!room.csCategory || cate[1] == room.csCategory) &&
                (cate[2] === ALR_INTENT_TYPE_NAME)}).length > 0);
    });

    let botRooms = assignRooms.filter((room) => {
      // 특정 인텐트에 관한 대화만 monitoring 하도록 변경
      return room.bot && room.monitoring &&
          (cateList.filter(cate => {
            return cate[0] == room.csService &&
                (!room.csCategory || cate[1] == room.csCategory) &&
                (cate[2] === MNT_INTENT_TYPE_NAME)}).length > 0);
    });

    debug('[getAvRooms] ' + supporter + ': ' + avRooms.length);
    // debug('[getBotRooms] ' + supporter + ': ' + botRooms.length);

    io.to(supporterSocketId).emit('getAvailableRooms',
        {avRooms: avRooms, botRooms: botRooms});
    // chatbotMonitor.to(supporterSocketId).emit('getAvailableRooms', {rooms: botRooms});
  }
};

var transferToAgent = (data) => {
  debug('[TransferToAgent]');

  query.insertChatSessionLog(data).then(result => {
    chatSessionMapByRoomId[data.roomId] = result.chatSessionId;
  });

  query.getPosCounselorsCnt(mappingBotAndCompany[data.csService]).then(result => {
    if (result.pocCounselors > 0) {
      sendSystemMsg(data.roomId, SM_WAIT_FOR_AGENT);
      updateRoomStatus(data, true);
      query.insertChatSessionLog(data);
    } else {
      let answer = '죄송합니다, 현재 상담 가능한 상담사가 없습니다. 아래 버튼을 통해 문의를 남기실 수 있습니다.'
          + '<br><a href="#" class="inquiry_btn">문의하기</a> |||INQUIRY||| {'
          + '"title":"문의하기", "tos":['
          + '{"title":"[필독] 개인정보동의약관", "check":"동의", "required":true, '
          + '"requireAlert":"개인정보 약관에 동의해주세요", "btn":"약관보기", "terms":"약관내용"}], '
          + '"form": {"comment":"안녕하세요. 원활한 문의접수를 위해 고객님의 정보를 입력해 주세요.", "field":{'
          + '"name": {"title":"이름", "required":true, "requireAlert":"이름을 입력해주세요.", "placeholder":"이름을 입력해주세요."},'
          + '"tel": {"title":"전화번호", "required":false, "requireAlert":"연락처를 입력해주세요."},'
          + '"email": {"title":"이메일", "required":true, "requireAlert":"이메일을 입력해주세요."},'
          + '"inquiry": {"title":"문의사항", "required":true, "placeholder":"내용을 입력해주세요", "requireAlert":"문의사항을 입력해주세요."}},'
          + '"submitBtn": "문의하기", "successPopup":{"title":"문의 접수 완료", "description":"문의 접수가 완료되었습니다.<br>담당자가 확인 후 안내를<br>드릴 수 있도록 하겠습니다."}}}'

      let talkObj = {
        userType: 'supporter',
        message: '죄송합니다, 현재 상담 가능한 상담사가 없습니다. 아래 버튼을 통해 문의를 남기실 수 있습니다.',
        adapterResponse: {'answer': answer, 'buttons':[{'display':'처음으로', 'intent':'처음으로'}]},
        date: getDate(), time: getTime(), timeDetail: getTimeWithSecond(),
        unreadUser: 1, unreadSupporter: 0
      };
      // socket.to(roomId).emit('message', {message: resUtter, userId: 'userId'});
      let data2 = {roomId: data.roomId, talkObj: talkObj};
      // to room
      io.to(data.roomId).emit('message', data2);
      previousMsg[data.roomId].push(talkObj);
    }
  });

  // let talkObj = {
  //   userType: 'supporter',
  //   message: '상담사 연결중입니다. 잠시만 기다려주세요.',
  //   adapterResponse: {'answer': '상담사 연결중입니다. 잠시만 기다려주세요.', 'buttons':[{'display':'챗봇으로 돌아가기', 'intent':'챗봇으로 돌아가기'}]},
  //   date: getDate(), time: getTime(), timeDetail: getTimeWithSecond(),
  //   unreadUser: 1, unreadSupporter: 0
  // };
  // // socket.to(roomId).emit('message', {message: resUtter, userId: 'userId'});
  // let data2 = {roomId: data.roomId, talkObj: talkObj};
  // // to room
  // io.to(data.roomId).emit('message', data2);
  // previousMsg[data.roomId].push(talkObj);
};

var updateRoomStatus = (data, transferToAgent = false,
    endConversation = false, monitoring = false) => {
  upsertRoom(data, transferToAgent, endConversation, monitoring);
  sendAvailableRooms(data);
};

var sendChatbotMonitoringChat = (data) => {
  // debug('[socketIdBySupporter]');
  // debug(socketIdBySupporter);
  let supporterList = [];
  if (data.csService) {
    supporterList = mapByBotId[data.csService];
  } else if (data.roomId) {
    let foundRoom = rooms.find(room => room.roomId === data.roomId);
    if (foundRoom && foundRoom.csService) {
      supporterList = mapByBotId[foundRoom.csService];
    }
  }
  for (let i in supporterList) {
    let supporter = supporterList[i];
    let supporterSocketId = socketIdBySupporter[supporter];
    // 연결 중인 상담사가 없음.
    if (!supporterSocketId) {
      continue;
    }
    debug('[sendChatbotMonitoringChat] ' + supporterSocketId);
    io.to(supporterSocketId).emit('message', data);
  }
};

function upsertRoom(data, transferToAgent = false, endConversation = false, monitoring = false) {
  //todo : insert to db

  let index = rooms.map((room) => room.roomId).indexOf(data.roomId);
  // room 이 이미 존재하는 경우
  if (index !== -1) {
    let room = rooms[index];
    if (data.userType === 'user') {
      if (transferToAgent) {
        room.bot = false;
        room.available = true;
        if (data.csCategory) {
          room.csCategory = data.csCategory;
        }
      } else if (monitoring) {
        room.bot = true; // 확인차
        room.available = false; // 확인차
        room.monitoring = true;
        if (data.csCategory) {
          room.csCategory = data.csCategory;
        }
      } else {
        if (room.status === 'end') {
          // room.roomId = data.roomId;
          // room.userId = data.userId;
          room.supporterId = undefined;
          room.csService = data.csService;
          room.csCategory = data.csCategory;
          room.bot = true;
          room.available = false;
          room.status = '';
          debug('[upsertRoom] room ' + data.roomId + ' starts again.');
        } else {
          debug('[upsertRoom] room already exist in list.');
        }
      }
    } else if (data.userType === 'supporter') {
      room.bot = false;
      room.available = false;
      room.supporterId = data.userId;
    }
    if (endConversation) {
      room.status = 'end';
    }
  } else {
    if (data.bot === undefined) {
      data.bot = true;
    }
    let room = {};
    room.roomId = data.roomId;
    room.userId = data.userId;
    room.csService = data.csService;
    room.csCategory = data.csCategory;
    room.bot = data.bot;
    room.available = !data.bot;
    room.status = '';
    room.monitoring = monitoring;

    rooms.push(room);

    previousMsg[room.roomId] = [];
  }

  debug('[upsertRoom] total rooms:' + rooms.length);
  // debug(rooms);
}

function getUUID() {
  function s4() {
    return ((1 + Math.random()) * 0x10000 | 0).toString(16).substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4()
      + s4();
}

function createRoomID(userId, csService) {
  return userId + '_' + csService;
}

/*global functions*/

function getDate() {
  let today = new Date();
  let year = today.getFullYear(); // 년도
  let month = today.getMonth() + 1;  // 월
  let date = today.getDate();  // 날짜
  let day = today.getDay();  // 요일
  let day_han = new Array('일', '월', '화', '수', '목', '금', '토');
  let res = year + '년 ' + month + '월 ' + date + '일 ' + day_han[day] + '요일';
  return res;
}

function getTime() {
  let today = new Date();
  let time = today.getHours().toString().padStart(2, '0')
      + ":" + today.getMinutes().toString().padStart(2, '0');
  return time;
}

function getTimeWithSecond() {
  let today = new Date();
  let time = today.getHours().toString().padStart(2, '0')
      + ":" + today.getMinutes().toString().padStart(2, '0')
      + ":" + today.getSeconds().toString().padStart(2, '0');
  return time;
}

const LANG = 'ko_KR';
const CHATBOT_NAME = 'Sully_eng';
const CHATBOT_SERVER_IP = 'localhost'; //sds-adapter IP, port
const CHATBOT_SERVER_PORT = 7641;

const TRANSFER_TO_AGENT_KEYWORDS = ['실시간상담', '실시간 상담', '상담사연결', '상담사 연결'];
// const TRANSFER_TO_CHATBOT_KEYWORD = ['챗봇으로 돌아가기', '챗봇으로돌아가기'];

// system message
const SM_AGENT_CONNECTED = 'Counselor connected';
const SM_BEGIN_CONVERSATION = 'Begin Conversation';
const SM_END_CONVERSATION = 'End this Conversation';
const SM_WAIT_FOR_AGENT = 'Waiting for counselors...';


const HEADERS = {"Content-Type": "application/json"};
const options = {
  hostname: `${CHATBOT_SERVER_IP}`,
  port: 6941,
  path: '/collect/run/utter',
  method: 'POST',
  headers: HEADERS
};

const MaumSdsChatbot = class {

  constructor() {
    // 마인즈랩 bot
    this.host = 74;
    this.lang = 2;

    this.options = {
      hostname: `${CHATBOT_SERVER_IP}`,
      port: `${CHATBOT_SERVER_PORT}`,
      path: '/adapter/simple',
      method: 'POST',
      headers: HEADERS
    };
  }

  sendMessage(roomId, talkParam) {

    var talkReq = http.request(this.options, (talkRes) => {
      // data for 'transferToAgent'
      let ttaData = {userType: 'user', roomId: roomId, csService: talkParam.host};
      let alrIntentList = cateMapByBotId[ttaData.csService];
      let content = '';

      talkRes.on('data', function (chunk) {
        content += String(chunk);
      });

      talkRes.on('end', function () {
        try {
          // debug('[chatbot sendMessage] Talk() response body: ' + content);
          // debug(JSON.parse(content));
          var response = JSON.parse(content);

          if (response.intent) {
            let intent = response.intent;
            debug('[chatbot sendMessage] intent : ' + intent);
            if (alrIntentList) {
              // ['실시간상담', 'MONITOR']
              let alrIntent = alrIntentList.find(i => {return i[0] === intent});

              if (alrIntent && alrIntent[1] === ALR_INTENT_TYPE_NAME) {
                debug('[chatbot sendMessage] alarm intent MATCH! ' );
                ttaData.csCategory = intent;
                delete response.buttons;
                sendTalkRes(response);
                transferToAgent(ttaData);
                // setCsCatetory(roomId, intent);
                return;
              } else if (alrIntent && alrIntent[1] === MNT_INTENT_TYPE_NAME) {
                debug('[chatbot sendMessage] monitoring intent MATCH! ' );
                // 모니터링 room에 추가
                ttaData.csCategory = intent;
                updateRoomStatus(ttaData, false, false, true);
              }
            }
          } else {
            debug('[chatbot sendMessage] No intent.');
            // transferToAgent(ttaData);
          }

          sendTalkRes(response);

        } catch (e) {
          debug('maum-SDS Talk() Error.');
          debug(e);
          // transferToAgent(ttaData);
        }
      });
    });

    function sendTalkRes(response) {
      // 'supporter', '무엇을 도와드릴까요?, '2020년 4월 20일 금요일', '13:25'
      let talkObj = {
        userType: 'bot',
        message: response.answer,
        adapterResponse: response,
        date: getDate(), time: getTime(), timeDetail: getTimeWithSecond(),
        unreadUser: 1, unreadSupporter: 0
      };
      // socket.to(roomId).emit('message', {message: resUtter, userId: 'userId'});
      let data = {roomId: roomId, talkObj: talkObj};
      // to room
      io.to(roomId).emit('message', data);

      previousMsg[roomId].push(talkObj);

      // to chatbot monitor
      sendChatbotMonitoringChat(data);
    }

    talkReq.write(JSON.stringify(talkParam));
    talkReq.end();

    talkReq.on('error', (e) => {
      debug('[chatbot sendMessage] ERR:' + e);
      throw e;
    });
  }
};

const Chatbot = class {

  constructor() {
    // 마인즈랩 bot
    this.host = 74;
    this.lang = 2;
  }

  sendMessage(socket, roomId, msg) {
    var talkParam = {
      lang: this.lang,
      host: this.host,
      session: roomId,
      data: {
        utter: msg
      }
    };

    var talkReq = http.request(options, (talkRes) => {
      debug('[chatbot sendMessage] Talk() statusCode:', talkRes.statusCode);
      var content = '';
      talkRes.on('data', function (chunk) {
        content += String(chunk);
      });
      talkRes.on('end', function () {

        try {
          // debug('[chatbot sendMessage] Talk() response body: ' + content);
          // debug(JSON.parse(content));
          var resUtter = JSON.parse(content).answer.answer;
          var expectedIntents = JSON.parse(content).expectedIntents;
          debug('[chatbot sendMessage] Talk() response utter : ');
          debug(resUtter);
          // 'supporter', '무엇을 도와드릴까요?, '2020년 4월 20일 금요일', '13:25'
          let talkObj = {
            userType: 'supporter', message: resUtter,
            expectedIntents: expectedIntents,
            date: getDate(), time: getTime(), timeDetail: getTimeWithSecond(),
            unreadUser: 1, unreadSupporter: 0
          };
          // socket.to(roomId).emit('message', {message: resUtter, userId: 'userId'});
          let data = {roomId: roomId, talkObj: talkObj};
          // to room
          io.to(roomId).emit('message', data);
          // to chatbot monitor
          chatbotMonitor.emit('message', data);

          previousMsg[roomId].push(talkObj);

        } catch (e) {
          debug('Talk() Error.');
          debug(e);
        }
      });
    });

    talkReq.write(JSON.stringify(talkParam));
    talkReq.end();

    talkReq.on('error', (e) => {
      debug('[chatbot sendMessage] ERR:' + e);
      // myBot.sendCommand('transferToAgent');
    });
  }
};



function updateCounselorsCnt(sessionID){
  console.log("[updateCounselorsCnt] : " + sessionID);
  query.getOnlyCounselorsID(sessionID).then(resultByID => {
    var input_obj = new Object();
    input_obj.user_id_par = sessionID;
    input_obj.cID = resultByID;
    query.getOnlyCounselorsCnt(input_obj).then(result => {
      let nowLogger = sds_config.loggerIP + ":" + sds_config.loggerPort;
      console.log("Update Counselors Count : Session - " + result.sessionID + " : Count - " + result.count +  " : counselerID  - " + result.counselorID + " : Sds Logger - " + nowLogger);
      let nowData = JSON.stringify({
        sessionID : result.sessionID,
        counselorsCnt : result.count,
        counselorID : result.counselorID
      })
      let options = {
        hostname: sds_config.loggerIP,
        port : sds_config.loggerPort,
        path: '/logger/sessionCounselor',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': nowData.length
        }
      }
      let reqToLogger = http.request(options, res => {
        console.log(`statusCode: ${res.statusCode}`)
        res.on('data', d => {
          process.stdout.write(d)
        })
      })
      reqToLogger.on('error', error => {
        console.error(error)
      })
      reqToLogger.write(nowData);
      reqToLogger.end();
    })
  })
}