module.exports = (sequelize, DataTypes) => {
  return sequelize.define('chat_history', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    session_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    talker_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    is_supporter: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    talk_text: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    input_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    input_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
  }, {
    timestamps: false,
    freezeTableName: true,
  });
}
