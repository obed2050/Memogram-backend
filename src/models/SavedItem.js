const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const SavedItem = sequelize.define('SavedItem', {
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
  itemType: {
    type: DataTypes.ENUM('post', 'memory', 'reel', 'album', 'event'),
    allowNull: false,
  },
  itemId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  timestamps: true,
  indexes: [
    { unique: true, fields: ['userId', 'itemType', 'itemId'] },
    { fields: ['userId'] },
    { fields: ['itemType'] },
  ],
});

module.exports = SavedItem;
