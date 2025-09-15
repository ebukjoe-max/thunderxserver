import express from 'express'
import register from '../../controllers/auth/register.js'
import {
  resetOtp,
  sendOtp,
  verifyOtp
} from '../../controllers/auth/forgotPassword.js'
import { updateUserProfile } from '../../controllers/auth/updateUserProfile.js'
import {
  getMe,
  login,
  logout,
  verifySession
} from '../../controllers/auth/login.js'

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.get('/getMe', verifySession, getMe)
router.get('/verifyToken', verifySession)
router.post('/logout', logout)
router.post('/send-otp', sendOtp)
router.post('/verify-otp', verifyOtp)
router.post('/update-profile', updateUserProfile)
router.post('/reset-password', resetOtp)

export default router
