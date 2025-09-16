import UserInfo from '../../models/userModel.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import sendEmail from '../../utilities/sendEmail.js'
import Session from '../../models/Session.js'

const jwtSecret = process.env.JWT_SECRET

export const login = async (req, res) => {
  const { email, password } = req.body

  try {
    const user = await UserInfo.findOne({ email })

    if (!user) {
      return res
        .status(404)
        .json({ status: 'error', message: 'No record found' })
    }

    const isMatch = await bcrypt.compare(password, user.hashedPassword)

    if (!isMatch) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Invalid password' })
    }

    // Generate JWT Token with userId + role
    const token = jwt.sign({ userId: user._id, role: user.role }, jwtSecret, {
      expiresIn: '30m'
    })

    // Create session
    const sessionId = Math.random().toString(36).substring(2)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 mins

    await Session.create({
      sessionId,
      userId: user._id,
      role: user.role,
      expiresAt
    })

    // Set httpOnly cookie
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 30 * 60 * 1000
    })
    // console.log('Session ID set:', sessionId)

    // Send login confirmation email to User
    await sendEmail(
      user.email,
      'Login Successful',
      `
      <p>Hi <b>${user.firstname}</b>,</p>
      <p>You have successfully logged in to your account.</p>
      <p>If this wasn't you, please reset your password immediately.</p>
      <li><b>Time:</b> ${new Date().toLocaleString()}</li>
      `
    )

    // Notify Admin
    await sendEmail(
      process.env.ADMIN_EMAIL,
      'User Login Alert',
      `
      <p>User <b>${user.firstname} ${user.lastname}</b> just logged in.</p>
      <ul>
        <li><b>Email:</b> ${user.email}</li>
        <li><b>Role:</b> ${user.role}</li>
        <li><b>Time:</b> ${new Date().toLocaleString()}</li>
      </ul>
      `
    )

    res.json({
      message: 'Login successful',
      user: { id: user._id, role: user.role, email: user.email }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ status: 'error', message: 'server error' })
  }
}

export const logout = async (req, res) => {
  try {
    const sessionId = req.cookies.sessionId
    if (sessionId) await Session.deleteOne({ sessionId })

    res.clearCookie('sessionId', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    })

    res.json({ message: 'Logged out successfully' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
}

export const verifySession = async (req, res, next) => {
  try {
    const sessionId = req.cookies.sessionId

    // console.log('Session ID:', sessionId)
    if (!sessionId) return res.status(401).json({ error: 'Not authenticated' })

    const session = await Session.findOne({ sessionId })
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Session expired' })
    }

    // Attach user info to request
    req.user = { id: session.userId, role: session.role }
    next()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}

export const getMe = async (req, res) => {
  try {
    const user = await UserInfo.findById(req.user.id).select(
      '-password -hashedPassword'
    ) // combine fields in a single string

    if (!user) return res.status(404).json({ error: 'User not found' })

    res.json({
      userId: user._id,
      role: user.role
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}
