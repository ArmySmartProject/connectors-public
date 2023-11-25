module.exports = (sequelize, DataTypes) => {
  return sequelize.define('cs_rel', {
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
    supporter_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    qualification: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
  }, {
    timestamps: false,
    freezeTableName: true,
  });
}
