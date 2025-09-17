import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import mongodbConnection from './configs/mongbDb.js'
import authRoutes from './routes/auth/auth.js'
import adminRoutes from './routes/admin/admin.js'
import userRoutes from './routes/user/users.js'
import transactionRoutes from './routes/user/userTransaction.js'
import paymentRoutes from './routes/payments/payment.js'
import loanRoutes from './routes/loan/loan.js'
import investmentRoutes from './routes/Investment/investment.js'
import { EventEmitter } from 'events'
import { authMiddleware } from './middleware/authMiddleware.js'

EventEmitter.defaultMaxListeners = 20

const app = express()

// middlewares
app.set('trust proxy', 1)
app.use(cookieParser())
dotenv.config()
app.use(express.json())
const allowedOrigins = [
  'http://localhost:3000',
  'http://10.0.1.3:3000',
  'http://192.168.250.88:3000',
  'http://172.20.10.2:3000',
  'https://thurderxtorm.netlify.app'
]

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true
  })
)

// ROUTES
app.use('/auth', authRoutes)
app.use('/admin', authMiddleware, adminRoutes)
app.use('/user', authMiddleware, userRoutes)
app.use('/transactions', authMiddleware, transactionRoutes)
app.use('/investments', authMiddleware, investmentRoutes)
app.use('/loans', authMiddleware, loanRoutes)
app.use('/payment', authMiddleware, paymentRoutes)
app.get('/', (req, res) => {
  try {
    console.log('server is running on port 5000')
    res.send('Serving is running')
  } catch (error) {
    console.log('error', error)
    res.send('server failed')
  }
})

mongodbConnection()

app.listen(5000, console.log(' server is up and running'))
