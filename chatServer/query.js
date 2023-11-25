const sequelize = require('sequelize');
const op = sequelize.Op;

var models = require('./../models');
var debug = require('debug')('chatserver:query');

/* insert talk history to connectors db */
exports.insertHistory = function (req, res, next) {
  if (req) {
    if (req.hasOwnProperty('roomId') && req.hasOwnProperty('userId')
        && req.hasOwnProperty('userType') && req.hasOwnProperty('userType')
        && req.hasOwnProperty('message')) {
      var isSupporter = req.userType == 'supporter' ? true : false;
      var roomId = req.roomId;
      var userId = req.userId;
      var message = req.message;
      var inputType = req.inputType;
      var sessionId = '';

      models.session.findAll({
        attributes: ['id'],
        where: {
          room_number: roomId,
          status: {[op.ne]: "end"}
        },
        order: [['created_at', 'DESC']]
      }).then(result => {
        if (result && result.length > 0) {
          sessionId = result[0].id
        }
        models.chat_history.create({
          'session_id': sessionId,
          'talker_id': userId,
          'is_supporter': isSupporter,
          'talk_text': message,
          'input_time': sequelize.literal('CURRENT_TIMESTAMP'),
          'input_type': inputType
        }).then(result2 => {
          debug('store chat history successfully.');
        }).catch(err2 => {
          debug('store chat history failed.');
          debug(err2);
        });
      }).catch(err => {
        debug('get session Id failed.');
        debug(err);
      });
    }
  }
};

exports.getAllBotMappingInfos = function (req, res, next) {

  return new Promise((resolve, reject) => {
    models.bot_mapping.findAll({
      attributes: ['company_id', 'bot_id'],
      order: [['no']]
    }).then(result => {
      let mappingBotAndCompany = {};

      if (result && result.length > 0) {
        for (i in result) {
          let dataValue = result[i].dataValues;
          if (mappingBotAndCompany.hasOwnProperty(dataValue.bot_id)) {
            mappingBotAndCompany[dataValue.bot_id].push(dataValue.company_id);
          } else {
            mappingBotAndCompany[dataValue.bot_id] = [dataValue.company_id];
          }
        }
      }

      getAllUserList().then(result2 => {
        let userMapByCompany = result2.userMapByCompany;

        let mapByBotId = {};
        let mapByUserId = {};

        if (result && result.length > 0) {
          for (i in result) {
            let botId = String(result[i].bot_id);
            let companyId = String(result[i].company_id);

            let userList = userMapByCompany[companyId];
            if (!companyId || !userList || userList.length <= 0) {
              continue;
            }

            if (mapByBotId.hasOwnProperty(botId)) {
              mapByBotId[botId] = mapByBotId[botId].concat(userList);
            } else {
              mapByBotId[botId] = userList;
            }
            
            for (i2 in userList) {
              let userId = userList[i2];
              if (mapByUserId.hasOwnProperty(userId)) {
                mapByUserId[userId].push(botId);
              } else {
                mapByUserId[userId] = [botId];
              }
            }
          }
        }

        debug('[ALL BOT MAPPING INFO] : ');
        debug(mapByBotId);
        debug(mapByUserId);
        debug(mappingBotAndCompany);
        debug('-------------------------------------------');

        resolve({mapByUserId: mapByUserId, mapByBotId: mapByBotId, mappingBotAndCompany: mappingBotAndCompany});

      });
    }).catch(err => {
      debug('getAllBotMappingInfos failed.');
      debug(err);
    });
  });
};

exports.getAllAlrIntMappingInfos = function (req, res, next) {

  return new Promise((resolve, reject) => {
    models.alr_int_mapping.findAll({
      attributes: ['bot_id', 'alr_intent_id', 'user_id'],
      order: [['id']]
    }).then(result => {

      getAllAlarmIntentInfos().then(result2 => {
        let alrIntentMap = result2.alrIntentMap;

        let mapByBotId = {};
        let mapByUserId = {};

        if (result && result.length > 0) {
          for (i in result) {
            let botId = String(result[i].bot_id);
            let userId = String(result[i].user_id);
            // [인텐트명, 타입] ex) ['실시간상담', 'REQUEST']
            let alrIntent = alrIntentMap[result[i].alr_intent_id];

            if (mapByBotId.hasOwnProperty(botId)) {
              mapByBotId[botId].push(alrIntent);
            } else {
              mapByBotId[botId] = [];
              mapByBotId[botId].push(alrIntent);
            }
            if (mapByUserId.hasOwnProperty(userId)) {
              mapByUserId[userId].push([botId, alrIntent[0], alrIntent[1]]);
            } else {
              mapByUserId[userId] = [[botId, alrIntent[0], alrIntent[1]]];
            }
          }
        }

        debug('[ALL ALR INTENT MAPPING INFO] : ');
        debug(mapByBotId);
        debug(mapByUserId);
        debug('-------------------------------------------');

        resolve({mapByUserId: mapByUserId, mapByBotId: mapByBotId});

      });

    }).catch(err => {
      debug('getAllAlrIntMappingInfos failed.');
      debug(err);
    });
  });
};

function getAllUserList() {
  return new Promise((resolve, reject) => {
    models.tn_user.findAll({
      attributes: ['user_id', 'company_id'],
      where: {use_at: 'Y'},
      order: [['user_no']]
    }).then(result => {
      let userMapByCompany = {};

      if (result && result.length > 0) {
        for (i in result) {
          let user = result[i];
          if (userMapByCompany.hasOwnProperty(user['company_id'])) {
            userMapByCompany[user['company_id']].push(user['user_id']);
          } else {
            userMapByCompany[user['company_id']] = [user['user_id']];
          }
        }
      }

      debug('[getAllUserList] : ');
      // debug(userMapByCompany);
      debug('-------------------------------------------');

      resolve({userMapByCompany: userMapByCompany});

    }).catch(err => {
      debug('getAllUserList failed.');
      debug(err);
    });
  });

}

function getAllAlarmIntentInfos() {

  return new Promise((resolve, reject) => {
    models.alarm_intent.findAll({
      attributes: ['id', 'domain', 'type', 'alr_intent', 'display_nm'],
      order: [['id']]
    }).then(result => {
      let alrIntentMap = {};

      if (result && result.length > 0) {
        for (i in result) {
          let intent = result[i];
          alrIntentMap[intent['id']] = [intent['alr_intent'], intent['type']];
        }
      }

      debug('[ALL ALARM/MONITORING INTENT INFO] : ');
      debug(alrIntentMap);

      resolve({alrIntentMap: alrIntentMap});

    }).catch(err => {
      debug('getAllAlarmIntentInfos failed.');
      debug(err);
    });
  });
}

// [maumSDS 챗봇 - fast 상담사] matching 정보 조회
exports.getMatchingSupporters = function (req, res) {

  return new Promise((resolve, reject) => {
    if (req && req.csService) {

      let botId = req.csService;
      models.bot_mapping.findAll({
        attributes: ['user_id'],
        where: {
          bot_id: botId
        },
        order: [['no']]
      }).then(result => {
        let agentList = [];

        if (result && result.length > 0) {
          for (i in result) {
            agentList.push(result[i].user_id);
          }
        }

        debug('[BOT MATCHING INFO] : ' + botId + ' --> ');
        debug(agentList);

        resolve(agentList);

      }).catch(err => {
        debug('getMatchingSupporters Id failed.');
        debug(err);
      });
    }
  });
};

// [maumSDS 챗봇 - fast 상담사] matching 정보 조회
exports.getMatchingServices = function (req, res) {
  return new Promise((resolve, reject) => {
    if (req && req.userId) {

      let supporterId = req.userId;
      models.bot_mapping.findAll({
        attributes: ['bot_id'],
        where: {
          user_id: supporterId
        },
        order: [['no']]
      }).then(result => {
        let botList = [];

        if (result && result.length > 0) {
          for (i in result) {
            botList.push(String(result[i].bot_id));
          }
        }

        debug('[BOT MATCHING INFO] : ' + req.userId + ' --> ');
        debug(botList);

        resolve(botList);

      }).catch(err => {
        debug('getMatchingSupporters Id failed.');
        debug(err);
      });
    }
  });
};

// company의 상담사 상태 조회
exports.getPosCounselorsCnt = function (req, res, next) {

  return new Promise((resolve, reject) => {
    models.tn_user.findAll({
      attributes: ['user_id', 'company_id', 'chat_consult_status'],
      where: {
        company_id: {
          [ op.or ]: req
        },
        chat_consult_status: "01"
      },
      order: [['user_no']]
    }).then(result => {
      let cnt = result.length;

      debug('[CONSULTING POSSIBLE COUNSELORS] : ' + cnt);

      resolve({pocCounselors: cnt});

    }).catch(err => {
      debug('getPosCounselorsCnt failed.');
      debug(err);
    });
  });
}

// 채팅상담 시작시 상담 session log 저장
exports.insertChatSessionLog = function (req, res, next) {
  return new Promise((resolve, reject) => {
    if (req) {
      if (req.hasOwnProperty('csService')&& req.hasOwnProperty('roomId')
          && req.hasOwnProperty('csCategory')) {
        var roomId = req.roomId;
        var userId = req.roomId.substring(0, 36);
        var serviceType = req.csCategory;
        var host = req.csService;

        models.chat_session_log.create({
          'host': host,
          'service_type': serviceType,
          'room_id': roomId,
          'user_id': userId,
          'status': 'WAITING',
          'start_dtm': sequelize.literal('CURRENT_TIMESTAMP')
        }).then(result => {
          debug('store chat session log successfully.');
          resolve({chatSessionId: result.dataValues.id})
        }).catch(err => {
          debug('store chat session log failed.');
          debug(err);
        });
      }
    }
  });
};

// 채팅상담 session log update
exports.updateChatSessionLog = function (req, res, next) {
  if (req) {
    if (req.hasOwnProperty('status') && req.hasOwnProperty('chatSessionLogId')) {
      var reqData = {};

      if (req.status === 'join') {
        var supporter_id = req.userId;
        reqData['supporter_id'] = supporter_id;
        reqData['status'] = 'CHATTING';
      } else if (req.status === 'end') {
        reqData['status'] = 'END';
        reqData['end_dtm'] = sequelize.literal('CURRENT_TIMESTAMP');
      }

      models.chat_session_log.update(
        reqData,
        {where: {
          id: req.chatSessionLogId
        }}
      ).then(result => {
        debug('update chat session log successfully.');
      }).catch(err => {
        debug('update chat session log failed.');
        debug(err);
      });
    }
  }
};

// 채팅상담 내용 log 저장
exports.insertChatLog = function (req, res, next) {
  if (req) {
    if (req.hasOwnProperty('roomId') && req.hasOwnProperty('chatSessionLogId')
        && req.hasOwnProperty('userType')) {
      var chat_session_log_id = req.chatSessionLogId;
      var host = req.roomId.substring(37);
      var userId = req.roomId.substring(0, 36);
      var is_supporter = req.userType == 'supporter' ? true : false;
      var utter = req.message;

      models.chat_log.create({
        'chat_session_log_id': chat_session_log_id,
        'host': host,
        'user_id': userId,
        'is_supporter': is_supporter,
        'utter': utter,
        'input_time': sequelize.literal('CURRENT_TIMESTAMP'),
        'input_type': 'TEXT'
      }).then(result => {
        debug('store chat log successfully.');
      }).catch(err => {
        debug('store chat log failed.');
        debug(err);
      });
    }
  }
};

exports.getOnlyCounselorsCnt = function (input_obj, res, next) {
  console.log("[getOnlyCounselorsCnt] : start");

  return new Promise((resolve, reject) => {
    models.chat_log.findAll({
      attributes: ['user_id', 'is_supporter'],
      where: {
        user_id: input_obj.user_id_par,
        is_supporter: "1"
      },
      order: [['id']]
    }).then(result => {
      let cnt = result.length;
      
      debug('[getOnlyCounselorsCnt] : ' + cnt);
      resolve({"sessionID" : input_obj.user_id_par, "count" : cnt, "counselorID" : input_obj.cID});
    }).catch(err => {
      debug('getOnlyCounselorsCnt failed.');
      debug(err);
    });
  });
}

exports.getOnlyCounselorsID = function (user_id_par, res, next) {
  console.log("[getOnlyCounselorsID] : start");

  return new Promise((resolve, reject) => {
    models.chat_session_log.findAll({
      attributes: ['user_id', 'supporter_id'],
      where: {
        user_id: user_id_par
      },
      order: [['id']]
    }).then(result => {
      let cnt = result.length;
      let nowCounselorID = "";
      for(let i = 0; i<result.length; i++){
        if(result[i].supporter_id!=null){
          if(result[i].supporter_id.length>0){
            nowCounselorID = result[i].supporter_id;
            break;
          }
        }
      }
      debug('[getOnlyCounselorsID] : ' + cnt);
      resolve(nowCounselorID);
    }).catch(err => {
      debug('getOnlyCounselorsID failed.');
      debug(err);
    });
  });
}

