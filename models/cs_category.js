module.exports = (sequelize, DataTypes) => {
  return sequelize.define('cs_category', {
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
    name: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
  }, {
    timestamps: false,
    freezeTableName: true,
  });
}
