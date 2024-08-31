import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import User, { userInterface } from '../models/user.model';
import { accountStatuses, availableUserRoles } from '../constants';
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from '../utils/cloudinary.js';

declare module 'express' {
  export interface Request {
    user?: userInterface;
  }
}

interface AvatarDataType {
  url: string;
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
}

interface FileType extends Request {
  file?: Express.Multer.File;
}

export const getCurrentUser = asyncHandler(
  async (req: Request, res: Response) => {
    const user = req.user;
    return res
      .status(200)
      .json(
        new ApiResponse(200, { userInfo: user }, 'user fetched successfully')
      );
  }
);

export const getAllUser = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;

  if (!user || user.role != availableUserRoles.ADMIN) {
    throw new ApiError(500, "you don't have access");
  }

  const users = await User.find({});
  return res
    .status(200)
    .json(new ApiResponse(200, { userInfo: users }, 'users data fetched'));
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  const { id } = req.params;

  if (!user || user.role != availableUserRoles.ADMIN) {
    throw new ApiError(500, "you don't have access");
  }

  if (!id) {
    throw new ApiError(404, 'please provid id');
  }

  const fetchedUser = await User.findById(id);
  if (!fetchedUser) {
    throw new ApiError(404, 'user not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { userInfo: fetchedUser }, 'user data fetched'));
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  const { id } = req.params;
  const updateData = req.body;

  if (!user) {
    throw new ApiError(401, 'user not authenticated');
  }

  if (user._id != id && user.role != availableUserRoles.ADMIN) {
    throw new ApiError(403, "you don't have access");
  }

  if (!id) {
    throw new ApiError(404, 'please provid user id');
  }

  const updatedUser = await User.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) {
    throw new ApiError(404, 'user not found');
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { userInfo: updatedUser },
        'user updated successfully'
      )
    );
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  const { id } = req.params;

  if (!user) {
    throw new ApiError(401, 'user not authenticated');
  }

  if (user._id != id && user.role != availableUserRoles.ADMIN) {
    throw new ApiError(403, "you don't have access");
  }

  if (!id) {
    throw new ApiError(404, 'please provide user id');
  }

  const deleteUser = await User.findById(id);
  if (deleteUser) {
    throw new ApiError(404, 'user not found');
  }

  const updatedUser = await User.findByIdAndUpdate(
    id,
    {
      $set: {
        status: accountStatuses.DELETED,
      },
    },
    { new: true }
  );

  if (!updatedUser) {
    throw new ApiError(500, 'something went wrong');
  }

  return res.status(200).json(new ApiResponse(200, 'user deleted'));
});

export const uploadAvatar = asyncHandler(
  async (req: FileType, res: Response) => {
    const uploadedFile = req.file;
    const { id } = req.params;
    const user = req.user;
    let changeAvatarUser;

    if (!user) {
      throw new ApiError(401, 'user not authenticated');
    }

    const findUser = await User.findById(id);
    if (!findUser) {
      throw new ApiError(404, 'user not found');
    }
    changeAvatarUser = findUser;

    if (id != user._id && user.role != availableUserRoles.ADMIN) {
      throw new ApiError(403, "you don't have access");
    }

    if (!uploadedFile) {
      throw new ApiError(400, 'no file uploaded');
    }

    const uploadOptions = {
      folder: 'avatar',
      width: 200,
      height: 200,
      crop: 'fit',
    };

    const img = await uploadOnCloudinary(uploadedFile.path, uploadOptions);
    if (!img) {
      throw new ApiError(500, `something went wrong`);
    }

    if (img.http_code === 400) {
      throw new ApiError(500, `error uploading image: ${img?.message}`);
    }

    const avatarData: AvatarDataType = {
      url: img.url,
      public_id: img.public_id,
      secure_url: img.secure_url,
      width: img.width,
      height: img.height,
      format: img.format,
    };

    const updatedUser = await User.findByIdAndUpdate(
      changeAvatarUser._id,
      {
        $set: {
          avatar: avatarData,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      throw new ApiError(500, 'something went wrong');
    }

    return res
      .status(200)
      .json(new ApiResponse(200, { userInfo: updatedUser }, 'image uploaded'));
  }
);

export const deleteAvatar = asyncHandler(
  async (req: Request, res: Response) => {
    const user = req.user;
    const { id } = req.params;

    if (!user) {
      throw new ApiError(401, 'user not authenticated');
    }

    if (user._id != id && user.role != availableUserRoles.ADMIN) {
      throw new ApiError(403, "you don't have access");
    }

    if (!id) {
      throw new ApiError(404, 'please provide user id');
    }

    let deleteAvatarUser = user;
    if (id != user._id && user.role == availableUserRoles.ADMIN) {
      const findUser = await User.findById(id);

      if (!findUser) {
        throw new ApiError(404, 'user not found');
      }
      deleteAvatarUser = findUser;
    }

    const publicId = deleteAvatarUser.avatar?.public_id;
    let deleteAvatarOnCloud:
      | { http_code?: number; message?: string }
      | boolean = false;

    if (publicId) {
      deleteAvatarOnCloud = await deleteFromCloudinary(publicId);
    } else {
      console.log('public ID is undefined, skipping Cloudinary deletion.');
    }

    if (typeof deleteAvatarOnCloud === 'boolean') {
      if (!deleteAvatarOnCloud) {
        throw new ApiError(500, `something went wrong error`);
      }
    } else if (deleteAvatarOnCloud.http_code === 400) {
      throw new ApiError(
        500,
        `error deleting image: ${deleteAvatarOnCloud?.message || 'Unknown error'}`
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        $unset: {
          avatar: 1,
        },
      },
      { new: true }
    );

    return res
      .status(200)
      .json(new ApiResponse(200, { userInfo: updatedUser }, 'image deleted'));
  }
);
