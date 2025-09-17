import mongoose from 'mongoose'
import User from '../../models/userModel.js'
import UserWallet from '../../models/UserWallet.js'

export const Users = async (req, res) => {
  try {
    const users = await User.find({}).select('firstname lastname email kyc')
    res.json(users)
  } catch (error) {
    res.status(500).json({ message: 'error', error })
  }
}

// update user info
export const updateUser = async (req, res) => {
  // console.log(req.params, req.body)
  try {
    const { userId } = req.params
    const { firstname, lastname, email, phoneNumber, userCountry } = req.body

    const user = await User.findByIdAndUpdate(
      userId,
      { firstname, lastname, email, phoneNumber, userCountry },
      { new: true }
    )

    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ success: true, user })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
}

// update wallet balance
export const updateWalletBalance = async (req, res) => {
  // console.log(req.params, req.body)
  try {
    const { userId, walletId } = req.params
    let { amount, action } = req.body // action: "add" | "subtract"

    // Ensure amount is a number
    amount = parseFloat(amount)
    if (isNaN(amount)) {
      return res.status(400).json({ error: 'Invalid amount' })
    }

    const wallet = await UserWallet.findOne({
      _id: walletId,
      userId: new mongoose.Types.ObjectId(userId)
    })

    // console.log(wallet)
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' })

    if (action === 'add') {
      wallet.balance = Number(wallet.balance) + amount
    } else if (action === 'subtract') {
      wallet.balance = Number(wallet.balance) - amount
    } else {
      return res.status(400).json({ error: 'Invalid action' })
    }

    await wallet.save()

    res.json({ success: true, wallet })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
