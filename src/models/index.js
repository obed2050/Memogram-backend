const sequelize = require('../config/database');
const User = require('./User');
const School = require('./School');
const SchoolHistory = require('./SchoolHistory');
const Post = require('./Post');
const Memory = require('./Memory');
const Comment = require('./Comment');
const Like = require('./Like');
const Follow = require('./Follow');
const Conversation = require('./Conversation');
const ConversationParticipant = require('./ConversationParticipant');
const Message = require('./Message');
const Notification = require('./Notification');
const Community = require('./Community');
const CommunityEvent = require('./CommunityEvent');
const GenerationDiscussion = require('./GenerationDiscussion');
const GenerationDiscussionReply = require('./GenerationDiscussionReply');
const EventAttendee = require('./EventAttendee');
const EventComment = require('./EventComment');
const Club = require('./Club');
const ClubMember = require('./ClubMember');
const BeforeNow = require('./BeforeNow');
const BeforeNowLike = require('./BeforeNowLike');
const BeforeNowComment = require('./BeforeNowComment');
const GuessWho = require('./GuessWho');
const GuessWhoPick = require('./GuessWhoPick');
const Album = require('./Album');
const AlbumItem = require('./AlbumItem');
const SavedItem = require('./SavedItem');
const Draft = require('./Draft');
const UserProfile = require('./UserProfile');
const { MemoryStreak } = require('./MemoryStreak');
const UserAchievement = require('./UserAchievement');
const UserBadge = require('./UserBadge');
const ModerationLog = require('./ModerationLog');
const ContentTag = require('./ContentTag');
const UserInteraction = require('./UserInteraction');
const RecommendationCache = require('./RecommendationCache');
const UserPreference = require('./UserPreference');
const AnalyticsEvent = require('./AnalyticsEvent');
const MessageReaction = require('./MessageReaction');
const MessageAttachment = require('./MessageAttachment');
const MessageRead = require('./MessageRead');
const Call = require('./Call');

// User <-> School (many-to-many via SchoolHistory)
User.belongsToMany(School, { through: SchoolHistory, foreignKey: 'userId', as: 'schools' });
School.belongsToMany(User, { through: SchoolHistory, foreignKey: 'schoolId', as: 'students' });

// SchoolHistory belongs to User and School
SchoolHistory.belongsTo(User, { foreignKey: 'userId', as: 'user' });
SchoolHistory.belongsTo(School, { foreignKey: 'schoolId', as: 'school' });

// User <-> User (Follow)
User.belongsToMany(User, { through: Follow, as: 'followers', foreignKey: 'followingId', otherKey: 'followerId' });
User.belongsToMany(User, { through: Follow, as: 'following', foreignKey: 'followerId', otherKey: 'followingId' });
Follow.belongsTo(User, { as: 'follower', foreignKey: 'followerId' });
Follow.belongsTo(User, { as: 'following', foreignKey: 'followingId' });

// Post
Post.belongsTo(User, { foreignKey: 'userId', as: 'author' });
Post.belongsTo(School, { foreignKey: 'schoolId', as: 'school', required: false });
User.hasMany(Post, { foreignKey: 'userId', as: 'posts' });

// Memory
Memory.belongsTo(User, { foreignKey: 'userId', as: 'author' });
Memory.belongsTo(School, { foreignKey: 'schoolId', as: 'school', required: false });
User.hasMany(Memory, { foreignKey: 'userId', as: 'memories' });

// Comment
Comment.belongsTo(User, { foreignKey: 'userId', as: 'author' });
Comment.belongsTo(Post, { foreignKey: 'postId', as: 'post' });
Comment.belongsTo(Comment, { foreignKey: 'parentCommentId', as: 'parentComment' });
Post.hasMany(Comment, { foreignKey: 'postId', as: 'comments' });
Comment.hasMany(Comment, { foreignKey: 'parentCommentId', as: 'replies' });

// Like
Like.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Like.belongsTo(Post, { foreignKey: 'postId', as: 'post' });
User.hasMany(Like, { foreignKey: 'userId', as: 'likes' });
Post.hasMany(Like, { foreignKey: 'postId', as: 'likes' });

// Conversation
Conversation.belongsToMany(User, { through: ConversationParticipant, as: 'participants', foreignKey: 'conversationId', otherKey: 'userId' });
User.belongsToMany(Conversation, { through: ConversationParticipant, as: 'conversations', foreignKey: 'userId', otherKey: 'conversationId' });
ConversationParticipant.belongsTo(User, { foreignKey: 'userId', as: 'user' });
ConversationParticipant.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });

// Message
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });
Conversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages' });
Message.belongsTo(Message, { foreignKey: 'replyToId', as: 'replyTo' });
Message.hasMany(MessageReaction, { foreignKey: 'messageId', as: 'reactions' });

// MessageReaction
MessageReaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });
MessageReaction.belongsTo(Message, { foreignKey: 'messageId', as: 'message' });
User.hasMany(MessageReaction, { foreignKey: 'userId', as: 'messageReactions' });

// MessageAttachment
MessageAttachment.belongsTo(Message, { foreignKey: 'messageId', as: 'message' });
Message.hasMany(MessageAttachment, { foreignKey: 'messageId', as: 'attachments' });

// MessageRead
MessageRead.belongsTo(Message, { foreignKey: 'messageId', as: 'message' });
MessageRead.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Message.hasMany(MessageRead, { foreignKey: 'messageId', as: 'reads' });
User.hasMany(MessageRead, { foreignKey: 'userId', as: 'messageReads' });

// Conversation -> lastMessageSender
Conversation.belongsTo(User, { foreignKey: 'lastMessageSenderId', as: 'lastMessageSender', required: false });

// Call
Call.belongsTo(User, { foreignKey: 'callerId', as: 'caller' });
Call.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });
Call.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });
User.hasMany(Call, { foreignKey: 'callerId', as: 'outgoingCalls' });
User.hasMany(Call, { foreignKey: 'receiverId', as: 'incomingCalls' });
Conversation.hasMany(Call, { foreignKey: 'conversationId', as: 'calls' });

// Notification
Notification.belongsTo(User, { foreignKey: 'userId', as: 'recipient' });
Notification.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });

// Community
Community.belongsTo(School, { foreignKey: 'schoolId', as: 'school' });
School.hasOne(Community, { foreignKey: 'schoolId', as: 'community' });

// CommunityEvent
CommunityEvent.belongsTo(School, { foreignKey: 'schoolId', as: 'school' });
CommunityEvent.belongsTo(User, { foreignKey: 'userId', as: 'creator' });
School.hasMany(CommunityEvent, { foreignKey: 'schoolId', as: 'events' });

// EventAttendee
EventAttendee.belongsTo(User, { foreignKey: 'userId', as: 'user' });
EventAttendee.belongsTo(CommunityEvent, { foreignKey: 'eventId', as: 'event' });
User.hasMany(EventAttendee, { foreignKey: 'userId', as: 'eventAttendances' });
CommunityEvent.hasMany(EventAttendee, { foreignKey: 'eventId', as: 'attendees' });

// EventComment
EventComment.belongsTo(User, { foreignKey: 'userId', as: 'author' });
EventComment.belongsTo(CommunityEvent, { foreignKey: 'eventId', as: 'event' });
EventComment.belongsTo(EventComment, { foreignKey: 'parentCommentId', as: 'parentComment' });
User.hasMany(EventComment, { foreignKey: 'userId', as: 'eventComments' });
CommunityEvent.hasMany(EventComment, { foreignKey: 'eventId', as: 'comments' });
EventComment.hasMany(EventComment, { foreignKey: 'parentCommentId', as: 'replies' });

// Memory -> Event link
Memory.belongsTo(CommunityEvent, { foreignKey: 'eventId', as: 'event', required: false });
CommunityEvent.hasMany(Memory, { foreignKey: 'eventId', as: 'memories' });

// GenerationDiscussion
GenerationDiscussion.belongsTo(User, { foreignKey: 'userId', as: 'author' });
GenerationDiscussion.belongsTo(School, { foreignKey: 'schoolId', as: 'school' });
User.hasMany(GenerationDiscussion, { foreignKey: 'userId', as: 'generationDiscussions' });
School.hasMany(GenerationDiscussion, { foreignKey: 'schoolId', as: 'generationDiscussions' });

// GenerationDiscussionReply
GenerationDiscussionReply.belongsTo(User, { foreignKey: 'userId', as: 'author' });
GenerationDiscussionReply.belongsTo(GenerationDiscussion, { foreignKey: 'discussionId', as: 'discussion' });
User.hasMany(GenerationDiscussionReply, { foreignKey: 'userId', as: 'generationReplies' });
GenerationDiscussion.hasMany(GenerationDiscussionReply, { foreignKey: 'discussionId', as: 'replies' });

// Club
Club.belongsTo(School, { foreignKey: 'schoolId', as: 'school' });
Club.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
School.hasMany(Club, { foreignKey: 'schoolId', as: 'clubs' });

// ClubMember
ClubMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });
ClubMember.belongsTo(Club, { foreignKey: 'clubId', as: 'club' });
User.hasMany(ClubMember, { foreignKey: 'userId', as: 'clubMemberships' });
Club.hasMany(ClubMember, { foreignKey: 'clubId', as: 'members' });

// Club -> Post link
Post.belongsTo(Club, { foreignKey: 'clubId', as: 'club', required: false });
Club.hasMany(Post, { foreignKey: 'clubId', as: 'posts' });

// Club -> Event link
CommunityEvent.belongsTo(Club, { foreignKey: 'clubId', as: 'club', required: false });
Club.hasMany(CommunityEvent, { foreignKey: 'clubId', as: 'events' });

// BeforeNow
BeforeNow.belongsTo(User, { foreignKey: 'userId', as: 'author' });
User.hasMany(BeforeNow, { foreignKey: 'userId', as: 'beforeNows' });
BeforeNow.belongsTo(School, { foreignKey: 'schoolId', as: 'school', required: false });
School.hasMany(BeforeNow, { foreignKey: 'schoolId', as: 'beforeNows' });

// BeforeNowLike
BeforeNowLike.belongsTo(User, { foreignKey: 'userId', as: 'user' });
BeforeNowLike.belongsTo(BeforeNow, { foreignKey: 'beforeNowId', as: 'beforeNow' });
User.hasMany(BeforeNowLike, { foreignKey: 'userId', as: 'beforeNowLikes' });
BeforeNow.hasMany(BeforeNowLike, { foreignKey: 'beforeNowId', as: 'likes' });

// BeforeNowComment
BeforeNowComment.belongsTo(User, { foreignKey: 'userId', as: 'author' });
BeforeNowComment.belongsTo(BeforeNow, { foreignKey: 'beforeNowId', as: 'beforeNow' });
BeforeNowComment.belongsTo(BeforeNowComment, { foreignKey: 'parentCommentId', as: 'parentComment' });
User.hasMany(BeforeNowComment, { foreignKey: 'userId', as: 'beforeNowComments' });
BeforeNow.hasMany(BeforeNowComment, { foreignKey: 'beforeNowId', as: 'comments' });
BeforeNowComment.hasMany(BeforeNowComment, { foreignKey: 'parentCommentId', as: 'replies' });

// GuessWho
GuessWho.belongsTo(User, { foreignKey: 'userId', as: 'author' });
User.hasMany(GuessWho, { foreignKey: 'userId', as: 'guessWhoChallenges' });
GuessWho.belongsTo(School, { foreignKey: 'schoolId', as: 'school', required: false });
School.hasMany(GuessWho, { foreignKey: 'schoolId', as: 'guessWhoChallenges' });

// GuessWhoPick
GuessWhoPick.belongsTo(User, { foreignKey: 'userId', as: 'guesser' });
GuessWhoPick.belongsTo(User, { foreignKey: 'guessedUserId', as: 'guessedUser' });
GuessWhoPick.belongsTo(GuessWho, { foreignKey: 'guessWhoId', as: 'challenge' });
User.hasMany(GuessWhoPick, { foreignKey: 'userId', as: 'guessWhoPicks' });
User.hasMany(GuessWhoPick, { foreignKey: 'guessedUserId', as: 'guessWhoTargetOf' });
GuessWho.hasMany(GuessWhoPick, { foreignKey: 'guessWhoId', as: 'picks' });

// Album
Album.belongsTo(User, { foreignKey: 'userId', as: 'author' });
User.hasMany(Album, { foreignKey: 'userId', as: 'albums' });

// AlbumItem
AlbumItem.belongsTo(Album, { foreignKey: 'albumId', as: 'album' });
AlbumItem.belongsTo(Post, { foreignKey: 'postId', as: 'post' });
Album.hasMany(AlbumItem, { foreignKey: 'albumId', as: 'items' });
Post.hasMany(AlbumItem, { foreignKey: 'postId', as: 'albumItems' });

// SavedItem
SavedItem.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(SavedItem, { foreignKey: 'userId', as: 'savedItems' });

// Draft
Draft.belongsTo(User, { foreignKey: 'userId', as: 'author' });
User.hasMany(Draft, { foreignKey: 'userId', as: 'drafts' });

// UserProfile
UserProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasOne(UserProfile, { foreignKey: 'userId', as: 'profile' });

// MemoryStreak
MemoryStreak.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasOne(MemoryStreak, { foreignKey: 'userId', as: 'memoryStreak' });

// UserAchievement
UserAchievement.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(UserAchievement, { foreignKey: 'userId', as: 'achievements' });

// UserBadge
UserBadge.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(UserBadge, { foreignKey: 'userId', as: 'badges' });

// ModerationLog
ModerationLog.belongsTo(User, { foreignKey: 'adminId', as: 'admin' });
ModerationLog.belongsTo(User, { foreignKey: 'targetUserId', as: 'targetUser', required: false });
ModerationLog.belongsTo(Post, { foreignKey: 'targetPostId', as: 'targetPost', required: false });
ModerationLog.belongsTo(Comment, { foreignKey: 'targetCommentId', as: 'targetComment', required: false });
User.hasMany(ModerationLog, { foreignKey: 'adminId', as: 'moderationActions' });

// ContentTag
ContentTag.belongsTo(Post, { foreignKey: 'postId', as: 'post' });
Post.hasMany(ContentTag, { foreignKey: 'postId', as: 'tags' });

// UserInteraction
UserInteraction.belongsTo(User, { foreignKey: 'userId', as: 'user' });
UserInteraction.belongsTo(Post, { foreignKey: 'postId', as: 'post' });
User.hasMany(UserInteraction, { foreignKey: 'userId', as: 'interactions' });
Post.hasMany(UserInteraction, { foreignKey: 'postId', as: 'interactions' });

// RecommendationCache
RecommendationCache.belongsTo(User, { foreignKey: 'userId', as: 'user' });
RecommendationCache.belongsTo(Post, { foreignKey: 'postId', as: 'post' });
User.hasMany(RecommendationCache, { foreignKey: 'userId', as: 'recommendations' });

// UserPreference
UserPreference.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(UserPreference, { foreignKey: 'userId', as: 'preferences' });

module.exports = {
  sequelize,
  User,
  School,
  SchoolHistory,
  Post,
  Memory,
  Comment,
  Like,
  Follow,
  Conversation,
  ConversationParticipant,
  Message,
  Notification,
  Community,
  CommunityEvent,
  GenerationDiscussion,
  GenerationDiscussionReply,
  EventAttendee,
  EventComment,
  Club,
  ClubMember,
  BeforeNow,
  BeforeNowLike,
  BeforeNowComment,
  GuessWho,
  GuessWhoPick,
  Album,
  AlbumItem,
  SavedItem,
  Draft,
  UserProfile,
  MemoryStreak,
  UserAchievement,
  UserBadge,
  ModerationLog,
  ContentTag,
  UserInteraction,
  RecommendationCache,
  UserPreference,
  AnalyticsEvent,
  MessageReaction,
  MessageAttachment,
  MessageRead,
  Call,
};