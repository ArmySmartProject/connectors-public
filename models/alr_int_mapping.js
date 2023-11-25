module.exports = (sequelize, DataTypes) => {
  return sequelize.define('ALR_INT_MAPPING', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    bot_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    alr_intent_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updater_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    }
  }, {
    timestamps: false,
    freezeTableName: true,
  });
};
