const mongoose = require("mongoose");
const { Schema, Models } = mongoose;

const useNameRegExp = /^[a-z,A-Z,0-9,_\.]*$/;

const justCreateOptions = { createdAt: "created_at", updatedAt: false };
const withModifyOptions = { ...justCreateOptions, updatedAt: "modify_at" };

const commonModelOptions = { timestamps: justCreateOptions };
const mutableModelOptions = { timestamps: withModifyOptions };

const UserSchema = new Schema(
  {
    username: {
      type: String,
      unique: true,
      validate: {
        validator: (u) => useNameRegExp.test(u),
        message: (props) =>
          `${props.value} is not correct username. Please use only latin symbols, numbers, dots and underscores.`,
      },
      required: true,
    },
    name: String,
    about_info: String,
    email: String,
  },
  commonModelOptions
);

const GroupSchema = new Schema(
  {
    owner_id: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    members: [
      {
        user_id: Schema.Types.ObjectId,
        invited_at: Date,
        is_admin: Boolean,
      },
    ],
  },
  commonModelOptions
);

const MessageSchema = new Schema(
  {
    author: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    message_content: {
      type: String,
      required: true,
    },
  },
  mutableModelOptions
);

const ConversationSchema = new Schema(
  {
    // It's the same stuff as conversation_id in test task requirement.
    conversation_id: {
      type: String,
      required: true,
    },
    title: String,
    messages: [MessageSchema],
  },
  commonModelOptions
);

const Conversation = new mongoose.model("Conversation", ConversationSchema);
const Message = new mongoose.model("Message", MessageSchema);
const User = new mongoose.model("User", UserSchema);
const Group = new mongoose.model("Group", GroupSchema);

module.exports = {
  Conversation,
  User,
  Group,
  Message,
};
