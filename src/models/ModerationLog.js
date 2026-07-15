const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const ModerationLog = sequelize.define('ModerationLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  action: {
    type: DataTypes.ENUM('delete_post', 'delete_comment', 'hide_comment', 'suspend_user', 'unsuspend_user', 'update_role', 'delete_user', 'delete_event'),
    allowNull: false,
  },
  adminId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  targetUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'Users', key: 'id' },
  },
  targetPostId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'Posts', key: 'id' },
  },
  targetCommentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'Comments', key: 'id' },
  },
  targetEventId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  meta: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['adminId'] },
    { fields: ['targetUserId'] },
    { fields: ['action'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = ModerationLog;
