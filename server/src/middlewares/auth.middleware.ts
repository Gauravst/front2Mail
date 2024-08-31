import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import User, { userInterface } from '../models/user.model';

interface decodeInterface {
  _id: string;
  email?: string;
  role?: string;
}

// custom interface for user in request
interface UserRequest extends Request {
  user?: userInterface;
}

export interface DecodedToken extends JwtPayload {
  _id: string;
}

export const verifyJWT = asyncHandler(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const accessToken =
      req.cookies?.accessToken ||
      req.header('Authorization')?.replace('Bearer ', '');

    const refreshToken =
      req.cookies?.refreshToken ||
      req.header('Authorization')?.replace('Bearer ', '');

    if (!accessToken || !refreshToken) {
      throw new ApiError(401, 'Unauthorized request');
    }

    let decodedAccessToken: decodeInterface;
    let decodedRefreshToken: decodeInterface;

    try {
      decodedAccessToken = jwt.verify(
        accessToken,
        process.env.ACCESS_TOKEN_SECRET as string
      ) as decodeInterface;

      decodedRefreshToken = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET as string
      ) as decodeInterface;
    } catch (err) {
      throw new ApiError(401, 'Invalid token');
    }

    if (decodedAccessToken._id !== decodedRefreshToken._id) {
      throw new ApiError(401, 'Invalid user');
    }

    const user = (await User.findById(decodedAccessToken._id).select(
      '-refreshToken -otp'
    )) as userInterface | null;

    if (!user) {
      throw new ApiError(401, 'invalid access token');
    }

    req.user = user;
    next();
  }
);
