const { Content } = require('../models');
const catchAsync = require('../utils/catchAsync');
const mongoose = require("mongoose");
const { getPaginateConfig } = require('../utils/queryPHandler');

// Create content
const createContent =  catchAsync(async (req, res) => {
  const { type, content } = req.body;
  const newContent = await Content.create({ type, content });
  res.status(201).json({data:newContent, message: 'Content created successfully', status:true});
})

// Get all contents (with pagination)
const getAllContents = catchAsync(async (req, res) => {
    const {filters, options} = getPaginateConfig(req.query);
    filters.isDeleted = false;
    const contents = await Content.paginate(filters, options);
  res.status(200).json({data:contents, status:true, message:"contents fetched successfully"});
})

// Get content by ID
const getContentById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const content = await Content.findOne({_id:new mongoose.Types.ObjectId(id)});
  if (!content || content.isDeleted) {
    res.status(404).json({ message: 'Content not found', status:false });
    return;
  }
  res.status(200).json({data:content, status:true, message:"content fetched successfully"});
})

// Update content by ID
const updateContent = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { type, content } = req.body;
  const updatedContent = await Content.findByIdAndUpdate(
    id,
    { type, content },
    { new: true }
  );
  if (!updatedContent || updatedContent.isDeleted) {
    res.status(404).json({ message: 'Content not found' , status:false});
    return;
  }
  res.status(200).json({data:updatedContent, message:"content updated successfully", status:true});
})

// Delete content by ID (soft delete)
const deleteContent = catchAsync(async (req, res) => {
  const { id } = req.params;
  const deletedContent = await Content.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );
  if (!deletedContent) {
    res.status(404).json({ message: 'Content not found' });
    return;
  }
  res.status(200).json({ message: 'Content deleted successfully' , status:true});
})

module.exports = {
  createContent,
  getAllContents,
  getContentById,
  updateContent,
  deleteContent,
};
