const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const AlbumItem = sequelize.define('AlbumItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  albumId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Albums', key: 'id' },
  },
  postId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Posts', key: 'id' },
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  timestamps: true,
  indexes: [
    { unique: true, fields: ['albumId', 'postId'] },
    { fields: ['postId'] },
  ],
});

module.exports = AlbumItem;
