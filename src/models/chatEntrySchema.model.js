const mongoose = require('mongoose');

const chatHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    chatEntries: [
      {
        query: { type: String, required: true },
        response: { type: mongoose.Schema.Types.Mixed },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema, 'chathistories');

module.exports = { ChatHistory };
