module.exports = (sequelize, DataTypes) => {
  return sequelize.define('service_info', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
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
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    support_guide: {
      type: DataTypes.BLOB,
      allowNull: true,
    },
    company_name: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    image: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    url: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
  }, {
    timestamps: false,
    freezeTableName: true,
    indexes: [
      {
        unique: true,
        fields: ['url']
      },
      {
        unique: true,
        fields: ['name', 'company_name']
      }
    ]
  });
}
