import UserInfo from '../../models/userModel.js'
import bcrypt from 'bcryptjs'
import sendEmail from '../../utilities/sendEmail.js'
import Session from '../../models/Session.js'
import crypto from 'crypto'

// Production/dev helper for cookie options
const getCookieOptions = req => {
  const isProduction = process.env.NODE_ENV === 'production'
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https'
  const options = {
    httpOnly: true,
    secure: isProduction ? isHttps : false,
    sameSite: isProduction ? 'None' : 'Lax',
    maxAge: 60 * 60 * 1000 // 1 hour, only relevant for res.cookie (not clearCookie)
  }
  console.log('Cookie options:', options)
  return options
}

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

    // Generate unique sessionId per login
    const sessionId = crypto.randomBytes(64).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 60 mins

    // Create or update user session
    await Session.findOneAndUpdate(
      { userId: user._id },
      { sessionId, role: user.role, expiresAt, createdAt: new Date() },
      { upsert: true, new: true }
    )

    // Set the session cookie
    res.cookie('sessionId', sessionId, getCookieOptions(req))

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
    res.status(500).json({ status: 'error', message: 'Server error' })
  }
}

export const logout = async (req, res) => {
  try {
    const sessionId = req.cookies.sessionId
    if (sessionId) await Session.deleteOne({ sessionId })
    // res.clearCookie: omit maxAge to avoid Express 5 deprecation
    const options = { ...getCookieOptions(req) }
    delete options.maxAge
    res.clearCookie('sessionId', options)
    res.json({ message: 'Logged out successfully' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
}

export const verifySession = async (req, res, next) => {
  try {
    const sessionId = req.cookies.sessionId
    if (!sessionId) return res.status(401).json({ error: 'Not authenticated' })

    const session = await Session.findOne({ sessionId })
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Session expired' })
    }

    req.user = { id: session.userId, role: session.role }
    next()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}

// Cookie debug route
export const cookiesTest = (req, res) => {
  res.cookie('testcookie', 'testvalue', {
    httpOnly: true,
    secure: false,
    sameSite: 'Lax'
  })
  res.send('Cookie set!')
}

export const getMe = async (req, res) => {
  try {
    const user = await UserInfo.findById(req.user.id).select(
      '-password -hashedPassword'
    )
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
