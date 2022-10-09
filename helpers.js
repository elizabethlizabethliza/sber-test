const { faker } = require("@faker-js/faker");

const generateUser = () => {
  const name = faker.name.firstName();
  return {
    name,
    username: faker.internet.userName(),
    email: faker.internet.email(name),
    about_info: faker.lorem.paragraph().slice(0, 12),
  };
};

const generateMessageBody = () => faker.lorem.sentence();

const randomIntInRange = (max, min = 0) =>
  Math.floor(Math.random() * (max - min) + min);
const randomBool = () => Math.random() >= 0.5;

const generateGroupTitle = faker.address.city;
const generateConversationTitle = () => faker.lorem.words(3);

const createLoadingInterval = () => {
  let loadingInterval = null;

  const start = (initialMessage) => {
    process.stdout.write(initialMessage);
    loadingInterval = setInterval(() => {
      process.stdout.write(".");
    }, 10);
  };

  const stop = () => {
    clearInterval(loadingInterval);
    process.stdout.write("\n");
  };

  return {
    start,
    stop,
  };
};

module.exports = {
  generateConversationTitle,
  generateUser,
  generateMessageBody,
  generateGroupTitle,
  createLoadingInterval,
  randomBool,
  randomIntInRange,
};
