import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import User, { userInterface } from '../models/user.model';
import jwt from 'jsonwebtoken';

import { cookieOptions } from '../constants.js';
import { sendEmail } from '../utils/mail/sendEmail';
import { generateOTP } from '../utils/otp/generateOTP';
import { DecodedToken } from '../middlewares/auth.middleware';

declare module 'express' {
  export interface Request {
    user?: userInterface;
  }
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

const generateAccessAndRefreshTokens = async (
  userId: string
): Promise<Tokens> => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(400, 'User not found');
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    if (!accessToken || !refreshToken) {
      throw new ApiError(500, 'Could not generate tokens');
    }

    // attach refresh token to the user document to avoid refreshing the access token with multiple refresh tokens
    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      'Something went wrong while generating the access token'
    );
  }
};

export const getNewOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email }: { email?: string } = req.params;

  if (!email) {
    throw new ApiError(400, 'missing required fields');
  }

  const otp = generateOTP(6);
  const now = new Date();
  const addTime = 20 * 60 * 1000;
  const otpExpiry = new Date(now.getTime() + addTime);

  const user = await User.findOne({ email });
  if (user) {
    await User.findByIdAndUpdate(user._id, {
      $set: {
        otp: otp,
        otpExpiry: otpExpiry,
      },
    });
  }

  if (!user) {
    await User.create({ email, otp, otpExpiry, newAccount: true });
  }

  const emailData = {
    email,
    template: 'confirmEmail',
    subject: 'Email Verification',
    otp,
  };
  await sendEmail(emailData);

  return res.status(200).json(new ApiResponse(200, 'otp send'));
});

export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp }: { email?: string; otp: number } = req.body;

  if (!email) {
    throw new ApiError(400, 'missing required fields');
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(500, 'something went worng');
  }

  const currentDate = new Date();
  if (user.otp !== otp) {
    throw new ApiError(400, 'wrong OTP');
  }

  if (user.otpExpiry < currentDate) {
    throw new ApiError(400, 'OTP has expired');
  }

  const refreshToken = user?.generateRefreshToken();
  const accessToken = user?.generateAccessToken();

  return res
    .status(200)
    .cookie('accessToken', accessToken, cookieOptions)
    .cookie('refreshToken', refreshToken, cookieOptions)
    .json(new ApiResponse(200, { userInfo: user }, 'login otp successfully'));
});

export const registerUser = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, email, phone } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throw new ApiError(404, 'user not found');
    }

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          name: name,
          email: email,
          phone: phone,
        },
      },
      { new: true }
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, { userInfo: updatedUser }, 'user info updated')
      );
  }
);

export const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;

  if (!user) {
    return res
      .status(200)
      .clearCookie('accessToken', cookieOptions)
      .clearCookie('refreshToken', cookieOptions)
      .json(new ApiResponse(200, 'user logged out'));
  }

  await User.findByIdAndUpdate(
    user.id,
    {
      $unset: {
        refreshToken: 1,
        otp: 1,
        otpExpiry: 1,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .clearCookie('accessToken', cookieOptions)
    .clearCookie('refreshToken', cookieOptions)
    .json(new ApiResponse(200, 'user logged out'));
});

export const refreshUserToken = asyncHandler(
  async (req: Request, res: Response) => {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
      throw new ApiError(401, 'Unauthorized request');
    }

    try {
      const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET!
      ) as DecodedToken;
      const user = await User.findById(decodedToken?._id);
      if (!user) {
        throw new ApiError(401, 'Invalid refresh token');
      }

      if (incomingRefreshToken !== user?.refreshToken) {
        throw new ApiError(401, 'Refresh token is expired or used');
      }

      const { accessToken, refreshToken: newRefreshToken } =
        await generateAccessAndRefreshTokens(String(user._id));

      return res
        .status(200)
        .cookie('accessToken', accessToken, cookieOptions)
        .cookie('refreshToken', newRefreshToken, cookieOptions)
        .json(
          new ApiResponse(
            200,
            { accessToken, refreshToken: newRefreshToken },
            'Access token refreshed'
          )
        );
    } catch (error) {
      if (error instanceof Error) {
        throw new ApiError(401, error?.message || 'Invalid refresh token');
      } else {
        throw new ApiError(401, 'Invalid refresh token');
      }
    }
  }
);
