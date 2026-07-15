const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Community = sequelize.define('Community', {
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: { model: 'Schools', key: 'id' },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: { len: [0, 2000] },
  },
  banner: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  rules: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  memberCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  timestamps: true,
  indexes: [
    { unique: true, fields: ['schoolId'] },
  ],
});

module.exports = Community;
