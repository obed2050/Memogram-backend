const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Like = sequelize.define('Like', {
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
}, {
  timestamps: true,
  indexes: [
    { unique: true, fields: ['userId', 'postId'] },
  ],
});

module.exports = Like;