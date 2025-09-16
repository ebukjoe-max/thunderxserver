import User from '../../models/userModel.js'
import UserWallet from '../../models/UserWallet.js'

const getUserWithWallets = async (req, res) => {
  try {
    const userId = req.params.userId // or from auth: req.user._id

    const user = await User.findById(userId) // hide password
    if (!user) return res.status(404).json({ message: 'User not found' })

    const wallets = await UserWallet.find({ userId })

    res.status(200).json({
      user: {
        firstname: user.firstname,
        lastname: user.lastname,
        name: `${user.firstname} ${user.lastname}`,
        email: user.email,
        refCode: user.refCode,
        referralBonus: user.referralBonus,
        phoneNumber: user.phoneNumber,
        userCountry: user.userCountry,
        password: user.password,
        userBalance: user.wallet.balance
      },
      wallets
    })
  } catch (error) {
    console.error('Error fetching user data:', error)
    res.status(500).json({ message: 'Server Error' })
  }
}

export default getUserWithWallets
