// User roles constants
export const availableUserRoles = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;
export type AvailableUserRolesType =
  (typeof availableUserRoles)[keyof typeof availableUserRoles];
export const availableUserRolesEnum: AvailableUserRolesType[] =
  Object.values(availableUserRoles);

export const accountStatuses = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  DELETED: 'DELETED',
  PENDING: 'PENDING',
  BANNED: 'BANNED',
  ARCHIVED: 'ARCHIVED',
  LOCKED: 'LOCKED',
} as const;

export type AccountStatusType =
  (typeof accountStatuses)[keyof typeof accountStatuses];

export const accountStatusesEnum: AccountStatusType[] =
  Object.values(accountStatuses);

// constants.ts
export enum AllowedImgExtensionsEnum {
  JPEG = 'jpeg',
  JPG = 'jpg',
  PNG = 'png',
  GIF = 'gif',
  BMP = 'bmp',
  TIFF = 'tiff',
  SVG = 'svg',
  WEBP = 'webp',
}

// URI base path
export const BASEPATH: string = '/api/v1';

// Local http PORT
export const PORT: number = 5000;

// Cookie options
export const cookieOptions: {
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'none' | 'lax' | 'strict';
  path: string;
  maxAge: number;
} = {
  secure: true,
  httpOnly: true,
  sameSite: 'none',
  path: '/',
  maxAge: 864000000, // 10 days
};
