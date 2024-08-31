import { Router } from 'express';
import {
  loginUser,
  registerUser,
  getNewOtp,
  refreshUserToken,
  logoutUser,
} from '../controllers/auth.controllers';
import {
  deleteAvatar,
  deleteUser,
  getAllUser,
  getCurrentUser,
  getUser,
  updateUser,
  uploadAvatar,
} from '../controllers/user.controllers';
import { verifyJWT } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/multer.middleware';

const router = Router();

// auth routes
router.route('/register').post(registerUser);
router.route('/login').post(loginUser);
router.route('/logout').post(verifyJWT, logoutUser);

router.route('/otp/:email').get(getNewOtp);

router.route('/refreshToken').post(refreshUserToken);

// user routes
router.route('/user').get(verifyJWT, getCurrentUser);
router.route('/users').get(verifyJWT, getAllUser);
router
  .route('/user/:id')
  .get(verifyJWT, getUser)
  .put(verifyJWT, updateUser)
  .delete(verifyJWT, deleteUser);

router
  .route('/updateAvatar/:id')
  .post(verifyJWT, upload.single('image'), uploadAvatar)
  .delete(verifyJWT, deleteAvatar);

export default router;
