import path from 'path';
import multer, { StorageEngine, FileFilterCallback } from 'multer';
import { AllowedImgExtensionsEnum } from '../constants';
import { Request } from 'express';
import { ApiError } from '../utils/ApiError';

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const allowedExtensionsArray = Object.values(AllowedImgExtensionsEnum);

export const upload = multer({
  dest: 'temp/',
  storage: multer.diskStorage({
    destination: 'tmp/',
    filename: (_, file, done) => {
      done(null, file.originalname);
    },
  }),
  fileFilter: (_, file, done: FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (
      !allowedExtensionsArray.includes(ext.slice(1) as AllowedImgExtensionsEnum)
    ) {
      throw new ApiError(500, 'unsupported image type!');
    }
    done(null, true);
  },
});
