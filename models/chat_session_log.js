module.exports = (sequelize, DataTypes) => {
  return sequelize.define('CHAT_SESSION_LOG', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    host: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    service_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    room_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    supporter_id: {
      type: DataTypes.STRING(1),
      allowNull: true
    },
    user_id: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'WAITING'
    },
    grade: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    grade_comment: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    supporter_comment: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    start_dtm: {
      type: DataTypes.DATE,
      allowNull: true
    },
    end_dtm: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    timestamps: false,
    freezeTableName: true,
  });
};
