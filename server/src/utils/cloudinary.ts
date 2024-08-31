import fs from 'fs/promises';
import {
  v2 as cloudinary,
  UploadApiOptions,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';

const cloudConfig = (): void => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
  });
};

export const uploadOnCloudinary = async (
  localFilePath: string,
  uploadOptions?: UploadApiOptions
): Promise<UploadApiResponse | UploadApiErrorResponse | null> => {
  try {
    cloudConfig();

    if (!localFilePath) {
      console.log('Local file path is missing');
      return null;
    }

    const res = await cloudinary.uploader.upload(localFilePath, uploadOptions);
    await fs.rm(localFilePath);
    return res;
  } catch (error) {
    await fs.rm(localFilePath);
    return error as UploadApiErrorResponse;
  }
};

/*
    deleteFromCloudinary is a function that will be used to remove the related images if any product or other item is deleted.
*/

export const deleteFromCloudinary = async (public_id: string): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      cloudConfig();
      const result = await cloudinary.uploader.destroy(public_id);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
};
