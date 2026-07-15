const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const STREAK_BADGE_THRESHOLDS = [
  { threshold: 3, name: 'Getting Started', icon: '🔥' },
  { threshold: 7, name: 'Week Warrior', icon: '⚔️' },
  { threshold: 14, name: 'Fortnight Fighter', icon: '🛡️' },
  { threshold: 30, name: 'Monthly Master', icon: '👑' },
  { threshold: 60, name: 'Streak Champion', icon: '🏆' },
  { threshold: 100, name: 'Century Club', icon: '💯' },
  { threshold: 365, name: 'Year Legend', icon: '🌟' },
];

const MemoryStreak = sequelize.define('MemoryStreak', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: { model: 'Users', key: 'id' },
  },
  currentStreak: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  longestStreak: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  lastMemoryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  totalMemoriesPosted: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  streakBadges: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
}, {
  tableName: 'memory_streaks',
  timestamps: true,
});

module.exports = { MemoryStreak, STREAK_BADGE_THRESHOLDS };
