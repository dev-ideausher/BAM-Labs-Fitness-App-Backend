const express = require('express');
const { fileUploadService } = require('../../microservices');
const catchAsync = require('../../utils/catchAsync');


const router = express.Router();

router.post(
    '/files',
    fileUploadService.multerUpload.array('files'),
    catchAsync(async (req, res) => {
      const files = req.files;
      if (!files || files.length === 0) {
        return res.status(400).json({error: 'No files were provided'});
      }
  
      const uploadedFiles = await fileUploadService.s3Upload(files);
      const fileData = uploadedFiles
        .filter(file => file !== null)
        .map(file => ({
          key: file.key,
          url: file.url,
        }));
  
      res.status(200).json({files: fileData});
    })
  );

module.exports = router;
