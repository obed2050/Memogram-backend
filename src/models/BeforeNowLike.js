const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const BeforeNowLike = sequelize.define('BeforeNowLike', {
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
  beforeNowId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'BeforeNows', key: 'id' },
  },
}, {
  timestamps: true,
  indexes: [
    { unique: true, fields: ['userId', 'beforeNowId'] },
  ],
});

module.exports = BeforeNowLike;
