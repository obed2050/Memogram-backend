const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const GuessWhoPick = sequelize.define('GuessWhoPick', {
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  guessWhoId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'GuessWhos', key: 'id' },
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  guessedUserId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
}, {
  timestamps: true,
  indexes: [
    { unique: true, fields: ['guessWhoId', 'userId'] },
    { fields: ['userId'] },
    { fields: ['guessedUserId'] },
  ],
});

module.exports = GuessWhoPick;
