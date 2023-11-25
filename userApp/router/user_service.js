const path = require('path');
var debug = require('debug')('userapp:user-service');
var models = require('../../models');
var moment = require('moment');

// development, production, test
const env = process.env.NODE_ENV || 'development';
const webSocketConfig = require(path.join(__dirname, '../..', 'config', 'websocket-config.json'))[env];
const chatServerIp = webSocketConfig.serverIp;
const chatServerPort = webSocketConfig.serverPort;

exports.getHome = function(req, res, next) {
  getChatRoomList(req.session.user).then((chatList) => {
    models.service_category.findAll()
    .then(result => {
      res.render('home.html',
          {
            result,
            chatList,
            userId: req.session.user,
            serverIp: chatServerIp,
            serverPort: chatServerPort
          });
    })
    .catch(err => {
      debug('getHome Error.');
      debug(err);
      res.render('error.html');
    });
  });
};

exports.getServiceList = function(req, res, next) {
  getChatRoomList(req.session.user).then((chatList) => {
    let sess = req.session;
    sess.topCategory = req.params.topCategory;
    models.service_info.findAll({
      include: [{
        model: models.service_category,
        where: {
          url: req.params.topCategory
        }
      }]
    })
    .then(result => {
      if (!result || result.length < 1) {
        throw new Error("Not Found");
      }
      res.render('service_list.html',
          {
            result, topCategory: sess.topCategory,
            chatList, userId: req.session.user,
            serverIp: chatServerIp, serverPort: chatServerPort
          });
    })
    .catch(err => {
      debug('getServiceList Error.');
      debug(err);
      res.render('error.html');
    });
  });
};

exports.getServiceHome = function(req, res, next) {
  let services;
  let faq;
  let sess = req.session;
  let topCategory;
  sess.company = req.params.service;

  getChatRoomList(req.session.user).then((chatList) => {

    models.service_category.findOne({
      include: [{
        model: models.service_info,
        where: {
          '$service_infos.url$': sess.company,
        }
      }]
    })
    .then(result => {
      if (!result || result.length < 1) {
        throw new Error("Not Found");
      }
      topCategory = result.getDataValue("url");

      return models.cs_category.findAll({
        include: [{
          model: models.service_info,
          where: {
            url: req.params.service
          }
        }]
      })
    })
    .catch(err => {
      debug('getServiceHome Error.');
      debug(err);
      res.render('error.html');
    })
    .then(result => {
      if (!result || result.length < 1) {
        throw new Error("Not Found");
      }
      services = result;
      return models.cs_category.findAll({
        attributes: ['cs_category.name'],
        include: [{model: models.service_info, required: true},
          {
            model: models.cs_qa_data, required: true
          }],
        where: {
          '$service_info.url$': req.params.service,
          '$cs_category.name$': services[0].name,
        }
      })
    })
    .catch(err => {
      debug('getServiceHome Error.');
      debug(err);
      res.render('error.html');
    })
    .then(result => {
      if (!result || result.length < 1) {
        throw new Error("Not Found");
      }

      faq = result;
      res.render('service_home.html',
          {
            services, faq, company: sess.company, topCategory: topCategory,
            chatList, userId: req.session.user,
            serverIp: chatServerIp, serverPort: chatServerPort
          });
    })
    .catch(err => {
      debug('getServiceHome Error.');
      debug(err);
      res.render('error.html');
    });
  });
};

exports.getCategoryFaq = function(req, res, next) {
  let sess = req.session;
  getChatRoomList(req.session.user).then((chatList) => {

    models.cs_category.findAll({
      attributes: ['cs_category.name'],
      include: [{model: models.service_info, required: true},
        {
          model: models.cs_qa_data, required: true
        }],
      where: {
        '$service_info.url$': sess.company,
        '$cs_category.name$': req.body.category,
      }
    })
    .then(result => {
      if (!result || result.length < 1) {
        throw new Error("Not Found");
      }
      res.send({result: result, chatList});
    })
    .catch(err => {
      debug('getCategoryFaq Error.');
      debug(err);
      res.render('error.html');
    });
  });
};

function getChatRoomList(userId) {
  return new Promise((resolve, reject) => {

  models.session.findAll({
    include: [
      {
        model: models.service_info,
      }
    ],
    where: {'$session.user_id$': userId},
    // group: ['service_info.name']
  })
  .then(result => {

    // 수동으로 group by service_info.name
    let groupByResult = [];
    result.forEach(session => {

      let foundService = groupByResult.find(service =>
          service.service_id === session.service_id);

      if (foundService) {
        let index = groupByResult.indexOf(foundService);
        // 가장 큰 id를 가지는 session으로 대체
        if (foundService.id < session.id) {
          groupByResult.splice(index, 1, session);
        }
      } else {
        groupByResult.push(session);
      }
    });

    result = groupByResult;

    resolve(result);

  })
  .catch(err => {
    debug('getChatRoomList Error.');
    debug(err);
  });
  });
}

exports.getChatList = function(req, res, next) {

  getChatRoomList(req.session.user).then((chatList) => {
    res.render('chatting_list.html',
        {serverIp: chatServerIp,
          serverPort: chatServerPort,
          userId: req.session.user,
          chatList}
    );
  });

};

exports.insertSession = function(req, res, next) {
  let serviceId;
  let userName;
  let status;
  let sessionId;

  models.service_info.findOne({
    attributes: ['id'],
    where: {name : req.body.serviceName, company_name: req.body.companyName}
  })
  .then(result => {
    if (!result || result.length < 1) {
      throw new Error("Not Found");
    }

    serviceId = result.getDataValue('id');

    return models.user_info.findOne({
      attributes: ['name'],
      where: {id: req.session.user}
    })
  })
  .then(result => {
    if (!result || result.length < 1) {
      throw new Error("Not Found");
    }

    userName = result.getDataValue('name');

    return models.session.findOne({
      attributes: ['id', 'status'],
      where: {user_id: req.session.user, service_id: serviceId},
      order: [['created_at', 'DESC']]
    });
  })
  .then(result => {
    if (!result || result.length < 1) {
      let date = moment().format('YYYY-MM-DD HH:mm:ss');

      return models.session.create({
        user_id: req.session.user,
        service_id: serviceId,
        room_number: req.session.user + "_" + req.body.serviceName,
        status: req.body.status,
        created_at: date
      });
    }

    status = result.getDataValue('status');
    if (status === 'end' || status === 'invalid') {
      let date = moment().format('YYYY-MM-DD HH:mm:ss');
      return models.session.create({
        user_id: req.session.user,
        service_id: serviceId,
        room_number: req.session.user + "_" + req.body.serviceName,
        status: req.body.status,
        created_at: date
      });
    } else{
      sessionId = result.getDataValue('id');
      res.status(200).json({'sessionId': sessionId});
    }
  })
  .then(result => {

    if (result) {
      sessionId = result.getDataValue('id');
      res.status(200).json({'sessionId': sessionId});
    }

  })
  .catch(err => {
    debug('insertSession Error.');
    debug(err);
    res.render('error.html');
  });
};

exports.getSessionInfo = function(req, res, next) {
  res.render('chat_user.html',
      {sessionId: req.body.sessionId,
        serverIp: chatServerIp,
        serverPort: chatServerPort,
        userId: req.session.user,
        csService: req.body.csService,
        csCategory: req.body.csCategory,
        question: req.body.question,
        supportType: req.body.supportType});
};

exports.getSetting = function(req, res, next) {
  getChatRoomList(req.session.user).then((chatList) => {
    models.user_info.findOne({
      where: {id: req.session.user}
    })
    .then(result => {
      res.render('setting.html', {
        result, chatList,
        serverIp: chatServerIp,
        serverPort: chatServerPort,
        userId: req.session.user
        });
    })
  });
};

exports.loginCheck = function(req, res, next) {
  req.session.user = req.body.email;
  req.session.userName = req.body.name;
  let url = req.headers.referer;
  let path = url.substring(url.indexOf("/", 8));
  models.user_info.findOne({
    where: {id : req.body.email}
  })
  .then(result => {
    if (result === null) {
      let date = moment().format('YYYY-MM-DD HH:mm:ss');
      return models.user_info.create({
        id: req.body.email,
        name: req.body.name,
        generate_time: date
      })
    }
  });
  if (req.body.email !== undefined && path !== '/user/login' &&
      path !== '/user/logout' && path !== '/user/login/callback/') {
    res.send({result:path});
  } else {
    res.send({result:'/user'})
  }
};

exports.login = function(req, res, next) {
  res.render('login.html');
};

exports.logout = function(req, res, next) {
  req.session.destroy();
  res.render('login.html');
};

exports.updateSession = function(req, res, next) {
  let date = moment().format('YYYY-MM-DD HH:mm:ss');
  models.session.update({
            status: 'end',
            grade: req.body.grade,
            grade_comment: req.body.evaluation,
            ended_at: date
          }, {
            where: {
              id: req.body.sessionId
            }
      })
  .then(result => {
    res.status(200).json({ completed: true });
  })
  .catch(err => {
    debug('getHome Error.');
    debug(err);
    res.render('error.html');
  });
};
