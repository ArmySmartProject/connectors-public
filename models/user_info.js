module.exports = (sequelize, DataTypes) => {
  return sequelize.define('user_info', {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    tel: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    generate_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expired_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
  }, {
    timestamps: false,
    freezeTableName: true,
  });
}
