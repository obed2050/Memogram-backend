const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const BeforeNow = sequelize.define('BeforeNow', {
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
  title: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  beforeImage: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  afterImage: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  beforeCaption: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  afterCaption: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  beforeYear: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  afterYear: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'Schools', key: 'id' },
  },
  generation: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  likesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  commentsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['schoolId'] },
    { fields: ['createdAt'] },
  ],
});

module.exports = BeforeNow;
