import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  accountStatusesEnum,
  AccountStatusType,
  availableUserRolesEnum,
  AvailableUserRolesType,
} from './../constants';
import jwt from 'jsonwebtoken';

// Define an interface for the user document
export interface userInterface extends Document {
  name: string;
  email: string;
  phone: number;
  avatar?: {
    url: string;
    public_id: string;
    width: number;
    height: number;
  };
  otp: number;
  otpExpiry: Date;
  newAccount: boolean;
  refreshToken: string;
  role: AvailableUserRolesType;
  activePlan?: string;
  status: AccountStatusType;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

// Define the user schema
const userSchema = new Schema<userInterface>(
  {
    name: {
      type: String,
      minlength: 3,
      maxlength: 50,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: Number,
      unique: true,
      minlength: 10,
      maxlength: 15,
    },
    avatar: {
      type: {
        url: String,
        public_id: String,
        width: Number,
        height: Number,
      },
    },
    otp: {
      type: Number,
      minlength: 4,
      maxlength: 4,
      trim: true,
    },
    otpExpiry: {
      type: Date,
    },
    newAccount: {
      type: Boolean,
      required: [true, 'newAccount is required'],
      default: false,
    },
    refreshToken: {
      type: String,
    },
    role: {
      type: String,
      enum: availableUserRolesEnum,
      default: availableUserRolesEnum[0],
    },
    activePlan: {
      type: Schema.Types.ObjectId,
      ref: 'Plans',
    },
    status: {
      type: String,
      enum: accountStatusesEnum,
      default: accountStatusesEnum[0],
    },
  },
  { timestamps: true }
);

// Pre middlewares will be written here
userSchema.methods.generateAccessToken = async function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      role: this.role,
    },
    process.env.ACCESS_TOKEN_SECRET!,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

userSchema.methods.generateRefreshToken = async function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET!,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );
};

// Define and export the User model
const User: Model<userInterface> = mongoose.model<userInterface>(
  'User',
  userSchema
);
export default User;
