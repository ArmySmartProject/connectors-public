module.exports = (sequelize, DataTypes) => {
  return sequelize.define('BOT_MAPPING', {
    no: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    company_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    bot_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    bot_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    lang: {
      type: DataTypes.INTEGER,
      allowNull: true,
    }
  }, {
    timestamps: false,
    freezeTableName: true,
  });
};
