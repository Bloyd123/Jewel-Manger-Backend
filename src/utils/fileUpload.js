// ============================================================================
// FILE: utils/fileUpload.js - ImageKit Implementation
// ============================================================================

import ImageKit from 'imagekit';
import multer from 'multer';
import path from 'path';
import { FileUploadError, BadRequestError } from './AppError.js';

/**
 * Initialize ImageKit
 */
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

/**
 * Configure Multer for memory storage
 * Files will be stored in memory buffer before uploading to ImageKit
 */
const multerStorage = multer.memoryStorage();

/**
 * Multer file filter - Accept only images
 */
const multerFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(
      new BadRequestError(
        'Only image files are allowed (jpeg, jpg, png, gif, webp)',
        'INVALID_FILE_TYPE'
      ),
      false
    );
  }
};

/**
 * Multer upload configuration
 */
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10, // Maximum 10 files
  },
});

/**
 * Upload single file to ImageKit
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {String} fileName - Original filename
 * @param {String} folder - Folder path in ImageKit
 * @returns {Promise<Object>} - ImageKit upload response
 */
export const uploadToImageKit = async (fileBuffer, fileName, folder = 'uploads') => {
  try {
    const result = await imagekit.upload({
      file: fileBuffer,
      fileName: `${Date.now()}-${fileName}`,
      folder: folder,
      useUniqueFileName: true,
      tags: ['jewelry', 'product'],
    });

    return {
      fileId: result.fileId,
      fileName: result.name,
      url: result.url,
      thumbnailUrl: result.thumbnailUrl,
      fileType: result.fileType,
      size: result.size,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    throw new FileUploadError(`ImageKit upload failed: ${error.message}`);
  }
};

/**
 * Upload multiple files to ImageKit
 * @param {Array} files - Array of files from multer
 * @param {String} folder - Folder path in ImageKit
 * @returns {Promise<Array>} - Array of upload results
 */
export const uploadMultipleToImageKit = async (files, folder = 'uploads') => {
  try {
    const uploadPromises = files.map((file) =>
      uploadToImageKit(file.buffer, file.originalname, folder)
    );

    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    throw new FileUploadError(`Multiple upload failed: ${error.message}`);
  }
};

/**
 * Delete file from ImageKit
 * @param {String} fileId - ImageKit file ID
 * @returns {Promise<Boolean>}
 */
export const deleteFromImageKit = async (fileId) => {
  try {
    await imagekit.deleteFile(fileId);
    return true;
  } catch (error) {
    throw new FileUploadError(`ImageKit delete failed: ${error.message}`);
  }
};

/**
 * Delete multiple files from ImageKit
 * @param {Array} fileIds - Array of ImageKit file IDs
 * @returns {Promise<Boolean>}
 */
export const deleteMultipleFromImageKit = async (fileIds) => {
  try {
    const deletePromises = fileIds.map((fileId) => deleteFromImageKit(fileId));
    await Promise.all(deletePromises);
    return true;
  } catch (error) {
    throw new FileUploadError(`Multiple delete failed: ${error.message}`);
  }
};

/**
 * Get optimized image URL
 * @param {String} url - Original ImageKit URL
 * @param {Object} transformations - Transformation options
 * @returns {String} - Transformed URL
 */
export const getOptimizedImageUrl = (url, transformations = {}) => {
  const defaultTransformations = {
    width: transformations.width || 800,
    height: transformations.height || 600,
    quality: transformations.quality || 80,
    format: transformations.format || 'webp',
    crop: transformations.crop || 'maintain_ratio',
  };

  const transformString = Object.entries(defaultTransformations)
    .map(([key, value]) => `${key}-${value}`)
    .join(',');

  // Extract path from URL
  const urlParts = url.split('/');
  const fileName = urlParts[urlParts.length - 1];
  const pathWithoutFile = urlParts.slice(0, -1).join('/');

  return `${pathWithoutFile}/tr:${transformString}/${fileName}`;
};

/**
 * Multer middleware exports
 */
export const uploadSingle = (fieldName) => upload.single(fieldName);
export const uploadMultiple = (fieldName, maxCount = 10) => upload.array(fieldName, maxCount);
export const uploadFields = (fields) => upload.fields(fields);

/**
 * Combined middleware for single file upload to ImageKit
 * Usage: router.post('/upload', uploadSingleImage('image', 'products'), controller)
 */
export const uploadSingleImage = (fieldName, folder = 'uploads') => {
  return [
    uploadSingle(fieldName),
    catchAsync(async (req, res, next) => {
      if (!req.file) {
        return next();
      }

      const uploadResult = await uploadToImageKit(
        req.file.buffer,
        req.file.originalname,
        folder
      );

      req.uploadedImage = uploadResult;
      next();
    }),
  ];
};

/**
 * Combined middleware for multiple files upload to ImageKit
 * Usage: router.post('/upload', uploadMultipleImages('images', 5, 'products'), controller)
 */
export const uploadMultipleImages = (fieldName, maxCount = 10, folder = 'uploads') => {
  return [
    uploadMultiple(fieldName, maxCount),
    catchAsync(async (req, res, next) => {
      if (!req.files || req.files.length === 0) {
        return next();
      }

      const uploadResults = await uploadMultipleToImageKit(req.files, folder);

      req.uploadedImages = uploadResults;
      next();
    }),
  ];
};

export { imagekit };