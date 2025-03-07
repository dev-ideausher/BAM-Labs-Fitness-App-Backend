const {ChatHistory} = require('../models');

const addChatEntry = async (userId, query, response) => {
  try {
    let chatHistory = await ChatHistory.findOne({user: userId});
    if (!chatHistory) {
      chatHistory = new ChatHistory({user: userId, chatEntries: []});
    }

    chatHistory.chatEntries.unshift({
      query,
      response,
      timestamp: new Date(),
    });

    if (chatHistory.chatEntries.length > 10) {
      chatHistory.chatEntries = chatHistory.chatEntries.slice(0, 10);
    }

    return await chatHistory.save();
  } catch (error) {
    console.error('Error adding chat entry:', error);
    throw error;
  }
};

const getChatHistory = async userId => {
  try {
    const chatHistory = await ChatHistory.findOne({ user: userId });
    if (chatHistory && chatHistory.chatEntries) {
      chatHistory.chatEntries.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );
    }
    return chatHistory ? chatHistory.chatEntries : [];
  } catch (error) {
    console.error('Error getting chat history:', error);
    throw error;
  }
};

const clearChatHistory = async userId => {
  try {
    return await ChatHistory.findOneAndUpdate({user: userId}, {$set: {chatEntries: []}}, {new: true});
  } catch (error) {
    console.error('Error clearing chat history:', error);
    throw error;
  }
};

module.exports = {
  addChatEntry,
  getChatHistory,
  clearChatHistory,
};
