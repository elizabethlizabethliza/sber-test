const { User, Message, Group, Conversation } = require("./models");
const { writeFile, rmdir, access } = require("fs/promises");
const { mkdirSync, existsSync, constants, rmSync } = require("fs");
const { join } = require("path");

const dataPathname = join(__dirname, "../", "result");

const NameModelMap = {
  user: User,
  group: Group,
  conversation: Conversation,
};

const clearAll = async () => {
  const models = [User, Message, Group, Conversation];
  for await (m of models) {
    await m.deleteMany();
  }

  try {
    if (existsSync(dataPathname)) {
      console.log("Remove previous results folder", dataPathname);
      rmSync(dataPathname, { recursive: true, force: true });
    }
  } catch (e) {
    console.error(e);
    console.error(
      `Directory ${dataPathname} doesn't exist or have a permission problem`
    );
  }
};

const loadAllDataToFiles = async () => {
  if (!existsSync(dataPathname)) {
    mkdirSync(dataPathname);
  }
  for await (name of Object.keys(NameModelMap)) {
    await writeFile(
      join(dataPathname, `${name}.json`),
      JSON.stringify(await NameModelMap[name].find(), null, 2),
      { encoding: "utf8" }
    );
  }
};

module.exports = {
  clearAll,
  loadAllDataToFiles,
};
