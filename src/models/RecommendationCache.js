const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const RecommendationCache = sequelize.define('RecommendationCache', {
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
  score: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  signals: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  reason: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['postId'] },
    { fields: ['userId', 'score'] },
    { fields: ['expiresAt'] },
    { unique: true, fields: ['userId', 'postId'] },
  ],
});

module.exports = RecommendationCache;
