module.exports = (sequelize, DataTypes) => {
  return sequelize.define('TN_USER', {
    user_id: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      allowNull: false
    },
    company_id: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    user_no: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    user_nm: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    use_at: {
      type: DataTypes.STRING(1),
      allowNull: false,
      defaultValue: 'Y'
    },
    chat_consult_status: {
      type: DataTypes.STRING(2),
      allowNull: false,
      defaultValue: '01'
    }
  }, {
    timestamps: false,
    freezeTableName: true,
  });
};
