const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const EventAttendee = sequelize.define('EventAttendee', {
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
  eventId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'CommunityEvents', key: 'id' },
  },
}, {
  timestamps: true,
  indexes: [
    { unique: true, fields: ['userId', 'eventId'] },
    { fields: ['eventId'] },
  ],
});

module.exports = EventAttendee;
