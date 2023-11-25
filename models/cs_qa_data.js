module.exports = (sequelize, DataTypes) => {
  return sequelize.define('cs_qa_data', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    question: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    answer: {
      type: DataTypes.BLOB,
      allowNull: true,
      get() {
        return this.getDataValue('answer').toString('utf8');
      }
    },
    support_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
  }, {
    timestamps: false,
    freezeTableName: true,
  });
}
