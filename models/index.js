const path = require('path');
const Sequelize = require('sequelize');

// development, production, test
const env = process.env.NODE_ENV || 'development';
const config = require(path.join(__dirname, '..', 'config', 'mysql-config.json'))[env];
const db = {};

const sequelize = new Sequelize(config.database, config.username, config.password, config);

db.sequelize = sequelize;
db.Sequelize = Sequelize;

//모델정보를 읽어온다.
db.chat_history = require('./chat_history')(sequelize, Sequelize);
db.user_info = require('./user_info')(sequelize, Sequelize);
db.service_category = require('./service_category')(sequelize, Sequelize);
db.service_info = require('./service_info')(sequelize, Sequelize);
db.cs_category = require('./cs_category')(sequelize, Sequelize);
db.cs_qa_data = require('./cs_qa_data')(sequelize, Sequelize);
db.cs_rel = require('./cs_rel')(sequelize, Sequelize);
db.session = require('./session')(sequelize, Sequelize);
db.supporter_info = require('./supporter_info')(sequelize, Sequelize);
db.supporter_management = require('./supporter_management')(sequelize, Sequelize);

db.bot_mapping = require('./bot_mapping')(sequelize, Sequelize);
db.alarm_intent = require('./alarm_intent')(sequelize, Sequelize);
db.alr_int_mapping = require('./alr_int_mapping')(sequelize, Sequelize);

db.tn_user = require('./tn_user')(sequelize, Sequelize);

db.chat_log = require('./chat_log')(sequelize, Sequelize);
db.chat_session_log = require('./chat_session_log')(sequelize, Sequelize);

//모델간의 관계를 정의한다.
db.supporter_management.belongsTo(db.supporter_info, {foreignKey: 'id'});
db.supporter_info.hasMany(db.session, {foreignKey: 'supporter_id'});
db.session.belongsTo(db.supporter_info, {foreignKey: 'supporter_id'});
db.supporter_info.hasMany(db.cs_rel, {foreignKey: 'supporter_id'});
db.cs_rel.belongsTo(db.supporter_info, {foreignKey: 'supporter_id'});
db.session.hasMany(db.chat_history, {foreignKey: 'session_id'});
db.chat_history.belongsTo(db.session, {foreignKey: 'session_id'});
db.user_info.hasMany(db.session, {foreignKey: 'user_id'});
db.session.belongsTo(db.user_info, {foreignKey: 'user_id'});
db.service_info.hasMany(db.cs_rel, {foreignKey: 'service_id'});
db.cs_rel.belongsTo(db.service_info, {foreignKey: 'service_id'});
db.service_info.hasMany(db.session, {foreignKey: 'service_id'});
db.session.belongsTo(db.service_info, {foreignKey: 'service_id'});
db.service_category.hasMany(db.service_info, {foreignKey: 'category_id'});
db.service_info.belongsTo(db.service_category, {foreignKey: 'category_id'});
db.service_info.hasMany(db.cs_category, {foreignKey: 'service_id'});
db.cs_category.belongsTo(db.service_info, {foreignKey: 'service_id'});
db.cs_category.hasMany(db.cs_qa_data, {foreignKey: 'category_id'});
db.cs_qa_data.belongsTo(db.cs_category, {foreignKey: 'category_id'});

module.exports = db;
