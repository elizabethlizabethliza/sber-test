const mongoose = require("mongoose");
const {
  addGroup,
  addUser,
  joinUserToGroup,
  createConversation,
  getConversationsByUserId,
  getUserGroups,
  getConversationMessages,
  createMessage,
  ConversationType,
} = require("./db/api");
const { loadAllDataToFiles, clearAll } = require("./db/utils");
const {
  randomIntInRange,
  randomBool,
  createLoadingInterval,
  generateMessageBody,
  generateUser,
  generateConversationTitle,
  generateGroupTitle,
} = require("./helpers");

const DefaultArgs = {
  usersNumber: 20,
  groupsNumber: 10,
  messagesNumber: 70,
};

const Const = {
  UsersNumber: DefaultArgs.usersNumber,
  GroupsNumber: DefaultArgs.groupsNumber,
  MessagesNumber: DefaultArgs.messagesNumber,
};

try {
  const [X, Y, M] = process.argv.slice(2, 5).map((s) => Number(s));
  Const.UsersNumber = X && !Number.isNaN(X) ? X : Const.UsersNumber;
  Const.GroupsNumber = Y && !Number.isNaN(Y) ? Y : Const.GroupsNumber;
  Const.MessagesNumber = M && !Number.isNaN(M) ? M : Const.MessagesNumber;
} catch (e) {
  console.error("Something failed in args parser", e);
}

const MINIMAL_PEOPLE_IN_GROUP = 10;
const MINIMAL_DIALOGS_PER_USER = 3;

if (Const.UsersNumber <= MINIMAL_PEOPLE_IN_GROUP) {
  Const.UsersNumber = MINIMAL_PEOPLE_IN_GROUP * 2;
  console.error(
    `Quite small users, it's impossible to create a Y group with 10. Turn to usage another X value - ${Const.UsersNumber}.`
  );
}

console.log("Result script arguments...");
console.log("User number", Const.UsersNumber);
console.log("Group number", Const.GroupsNumber);
console.log("Message number", Const.MessagesNumber);
(async function main() {
  await mongoose.connect("mongodb://localhost:27017/test");
  await clearAll();

  const localUsers = new Map();
  const localGroups = new Map();
  const localConversations = new Map();

  const loadingInterval = createLoadingInterval();

  const getRandomExistEntity = (entityMap) => () =>
    [...entityMap.entries()][randomIntInRange(entityMap.size)][0];

  const getRandomExistUser = getRandomExistEntity(localUsers);
  const getRandomExistGroup = getRandomExistEntity(localGroups);
  const getRandomItemIn = (entities) =>
    entities[randomIntInRange(entities.length)];

  loadingInterval.start(`Generating ${Const.UsersNumber} users...`);
  for await (i of [...Array(Const.UsersNumber)]) {
    const user = await addUser(generateUser());
    if (user) {
      localUsers.set(user._id.toString(), user);
    }
  }
  loadingInterval.stop();

  loadingInterval.start(`Generating ${Const.GroupsNumber} group...`);
  for await (i of [...Array(Const.GroupsNumber)]) {
    const group = await addGroup(generateGroupTitle(), getRandomExistUser());
    if (group) {
      localGroups.set(group._id.toString(), group);
    }
  }
  loadingInterval.stop();

  loadingInterval.start(`Joining users to group...`);
  for await ([id, group] of localGroups.entries()) {
    while (localGroups.get(id).members.length < MINIMAL_PEOPLE_IN_GROUP) {
      try {
        const result = await joinUserToGroup(
          id,
          getRandomExistUser(),
          randomBool()
        );
        if (result) {
          localGroups.set(id, result);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }
  loadingInterval.stop();

  loadingInterval.start(`Check if any user doesn't have a group`);
  for await ([userId] of localUsers.entries()) {
    while (!(await getUserGroups(userId)).length) {
      await joinUserToGroup(getRandomExistGroup(), userId, randomBool());
    }
  }
  loadingInterval.stop();

  loadingInterval.start(
    `Generation conversation that every user has at least ${MINIMAL_DIALOGS_PER_USER} conversation, including group conversations`
  );
  for await ([userId] of localUsers.entries()) {
    while (
      (await getConversationsByUserId(userId)) <=
      MINIMAL_DIALOGS_PER_USER - 1
    ) {
      const userGroups = await getUserGroups(userId);
      const typeDependedData = randomBool()
        ? {
            type: ConversationType.group,
            members: [getRandomItemIn(userGroups)._id],
          }
        : {
            type: ConversationType.user,
            members: [
              userId,
              getRandomItemIn(
                Array.from(localUsers.entries())
                  .filter(([id]) => id !== userId)
                  .map(([id]) => id)
              ),
            ],
          };

      const conversation = await createConversation(
        typeDependedData.type,
        typeDependedData.members,
        generateConversationTitle()
      );

      if (conversation) {
        localConversations.set(conversation._id, conversation);
      }
    }
  }
  loadingInterval.stop();

  loadingInterval.start(
    `Generating ${Const.MessagesNumber} numbers for each conversation`
  );
  for await ([_, { conversation_id }] of localConversations.entries()) {
    while (
      (await getConversationMessages(conversation_id)).length <
      Const.MessagesNumber
    ) {
      await createMessage(
        conversation_id,
        generateMessageBody(),
        getRandomExistUser()
      );
    }
  }
  loadingInterval.stop();

  loadingInterval.start("Unloading result storages to directory");
  await loadAllDataToFiles();
  loadingInterval.stop();

  console.log(`That end. You can see the result here in "./result" folder.`);
})();
