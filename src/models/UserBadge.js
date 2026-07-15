const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserBadge = sequelize.define('UserBadge', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  badgeId: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  label: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  icon: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  color: {
    type: DataTypes.STRING(30),
    defaultValue: 'default',
  },
  category: {
    type: DataTypes.STRING(30),
    defaultValue: 'general',
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  awardedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'user_badges',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['userId', 'badgeId'] },
  ],
});

module.exports = UserBadge;
