module.exports = (sequelize, DataTypes) => {
  return sequelize.define('ALARM_INTENT', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    domain: {
      type: DataTypes.STRING(200),
      allowNull: false,
      defaultValue: 'HOTEL'
    },
    type: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'INTENT'
    },
    alr_intent: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    display_nm: {
      type: DataTypes.STRING(200),
      allowNull: true,
    }
  }, {
    timestamps: false,
    freezeTableName: true,
  });
};
