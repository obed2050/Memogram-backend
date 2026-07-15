const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const UserInteraction = sequelize.define('UserInteraction', {
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
  postId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Posts', key: 'id' },
  },
  interactionType: {
    type: DataTypes.ENUM('view', 'like', 'comment', 'save', 'share', 'click'),
    allowNull: false,
  },
  dwellTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['postId'] },
    { fields: ['userId', 'interactionType'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = UserInteraction;
