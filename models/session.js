module.exports = (sequelize, DataTypes) => {
  return sequelize.define('session', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    service_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    room_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    supporter_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    user_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    grade: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ended_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    grade_comment: {
      type: DataTypes.BLOB,
      allowNull: true,
    },
  }, {
    timestamps: false,
    freezeTableName: true,
  });
}
