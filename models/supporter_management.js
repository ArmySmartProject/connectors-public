module.exports = (sequelize, DataTypes) => {
  return sequelize.define('supporter_management', {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      allowNull: false,
    },
    support_cnt: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    grade_cnt: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    total_grade: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    panelty: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    timestamps: false,
    freezeTableName: true,
  });
}
