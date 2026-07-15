const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const AnalyticsEvent = sequelize.define('AnalyticsEvent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  eventType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    index: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'Users', key: 'id' },
    onDelete: 'SET NULL',
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['eventType', 'createdAt'] },
    { fields: ['userId', 'eventType'] },
  ],
});

module.exports = AnalyticsEvent;
