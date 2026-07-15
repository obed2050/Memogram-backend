const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const UserPreference = sequelize.define('UserPreference', {
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  preferenceType: {
    type: DataTypes.ENUM('tag', 'school', 'author', 'content_type'),
    allowNull: false,
  },
  preferenceKey: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  affinity: {
    type: DataTypes.FLOAT,
    defaultValue: 1.0,
  },
  lastUpdated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['userId', 'preferenceType'] },
    { unique: true, fields: ['userId', 'preferenceType', 'preferenceKey'] },
  ],
});

module.exports = UserPreference;
