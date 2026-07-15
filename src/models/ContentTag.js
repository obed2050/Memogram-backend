const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const ContentTag = sequelize.define('ContentTag', {
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  postId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Posts', key: 'id' },
  },
  tag: {
    type: DataTypes.STRING(100),
    allowNull: false,
    lowercase: true,
    trim: true,
  },
  source: {
    type: DataTypes.ENUM('auto', 'user', 'ai'),
    defaultValue: 'auto',
  },
  weight: {
    type: DataTypes.FLOAT,
    defaultValue: 1.0,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['postId'] },
    { fields: ['tag'] },
    { unique: true, fields: ['postId', 'tag'] },
  ],
});

module.exports = ContentTag;
