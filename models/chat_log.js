module.exports = (sequelize, DataTypes) => {
  return sequelize.define('CHAT_LOG', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    chat_session_log_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    host: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    user_id: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    is_supporter: {
      type: DataTypes.STRING(1),
      allowNull: false,
    },
    utter: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    input_time: {
      type: DataTypes.DATE,
      allowNull: false
    },
    input_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'TEXT'
    }
  }, {
    timestamps: false,
    freezeTableName: true,
  });
};
