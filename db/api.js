const { User, Message, Group, Conversation } = require("./models");
const mongoose = require("mongoose");

const ConversationType = {
  group: "group",
  user: "user",
};

const ObjectId = (stringId) => mongoose.Types.ObjectId(stringId);

const addUser = async ({ username, name, email, about_info }) => {
  try {
    const user = new User({
      username,
      name,
      email,
      about_info,
    });

    return user.save();
  } catch (e) {
    console.log(e);
  }
};

const isGroupExist = (groupId) => Group.exists({ _id: groupId }).then(Boolean);

const addGroup = async (title, creatorId) => {
  checkIsUserExist(creatorId);

  const group = new Group({
    owner_id: ObjectId(creatorId),
    title,
  });

  return group.save();
};

const isUserExist = (userId) =>
  User.exists({ _id: ObjectId(userId) }).then(Boolean);

const checkIsUserExist = (userId) =>
  isUserExist(userId).then((u) => {
    if (!u) throw new Error(`User with identifier ${userId} doesn't exist`);
  });

const checkIsGroupExist = (groupId) =>
  Group.exists({ _id: groupId }).then((u) => {
    if (!u) throw new Error(`Group with identifier ${groupId} doesn't exist`);
  });

const joinUserToGroup = async (groupId, userId, isAdmin = false) => {
  await checkIsUserExist(userId);

  const group = await Group.findOne({ _id: ObjectId(groupId) }).exec();

  if (!group) {
    return new Error(`Group with identifier ${groupId} doesn't exist`);
  }

  const isUserAlreadyInGroup =
    group.owner_id.toString() === userId ||
    group.members.find((m) => m.user_id.toString() === userId);

  if (isUserAlreadyInGroup) {
    // console.error(`User with identifier ${userId} is already part of the group ${group.title}`)
    return;
  }

  return Group.updateOne(
    { _id: ObjectId(groupId) },
    {
      $push: {
        members: {
          user_id: ObjectId(userId),
          invited_at: Date.now(),
          is_admin: isAdmin,
        },
      },
    }
  ).then(() => Group.findOne({ _id: ObjectId(groupId) }).exec());
};

const getConversation = (id) =>
  Conversation.findOne({ conversation_id: id }).exec();

const createConversation = async (type, members, title) => {
  if (!Array.isArray(members)) {
    throw new Error(`Members should be an array`);
  }

  const conversationId =
    type === ConversationType.user ? members.join("_") : members[0];

  const existConversation = await getConversation(conversationId);

  if (existConversation) {
    // console.error(`Conversation between ${members.join(' and ')} already exist`)
    return;
  }

  const conversation = new Conversation({
    title,
    conversation_id: conversationId,
    type,
  });

  return conversation.save();
};

const getUserGroups = (userId) =>
  Group.find({
    $or: [
      { "members.user_id": ObjectId(userId) },
      { owner_id: ObjectId(userId) },
    ],
  }).exec();

const getConversationsByUserId = async (userId) => {
  await checkIsUserExist(userId);

  const userGroups = await getUserGroups(userId);

  const allGroupRegex = userGroups.length
    ? `|(${userGroups.map((g) => g._id).join("|")})`
    : "";

  const regExForSearch = new RegExp(
    `((${userId})|_(${userId}))${allGroupRegex}`
  );

  return Conversation.find({ conversation_id: regExForSearch });
};

const checkIfConversationExist = async (id) => {
  if (!(await getConversation(id))) {
    throw new Error(`Conversation ${id} doesn't exist`);
  }
};

const createMessage = async (conversationId, messageBody, authorId) => {
  await checkIfConversationExist(conversationId);
  await checkIsUserExist(authorId);

  const message_content = messageBody && messageBody.trim();

  if (!message_content || !message_content.length) {
    throw new Error(`Message hasn't a content`);
  }

  const message = new Message({
    message_content,
    author_id: ObjectId(authorId),
  });

  return Conversation.updateOne(
    { conversation_id: conversationId },
    { $push: { messages: message } }
  );
};

const getConversationMessages = (id) =>
  getConversation(id).then((r) => r.messages);

module.exports = {
  addUser,
  addGroup,
  joinUserToGroup,
  createConversation,
  getConversationsByUserId,
  getUserGroups,
  createMessage,
  getConversationMessages,
  ConversationType,
};
