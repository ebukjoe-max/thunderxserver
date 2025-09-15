import User from '../../models/userModel.js'

// User submits KYC
export const submitKyc = async (req, res) => {
  try {
    const { userId, ...fields } = req.body
    const user = await User.findById(userId)
    if (!user)
      return res.status(404).json({ success: false, error: 'User not found' })

    // Save fields into user.kyc object
    user.kyc = {
      ...fields,
      status: 'pending',
      submittedAt: new Date()
    }

    await user.save()
    res.json({ success: true, kyc: user.kyc })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// Admin updates status
export const updateKycStatus = async (req, res) => {
  try {
    const { userId, decision } = req.params // <-- use params
    if (!['approved', 'rejected', 'pending'].includes(decision)) {
      return res.status(400).json({ success: false, error: 'Invalid status' })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    user.kyc.status = decision
    await user.save()

    res.json({ success: true, kyc: user.kyc })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// Fetch user KYC
export const getUserKyc = async (req, res) => {
  // console.log('Fetching KYC for user:', req.params.userId)
  try {
    const user = await User.findById(req.params.userId).select(
      'firstname lastname email kyc'
    )
    if (!user)
      return res.status(404).json({ success: false, error: 'User not found' })

    res.json({
      success: true,
      kyc: user.kyc,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const getAllUserKycs = async (req, res) => {
  try {
    const users = await User.find({
      'kyc.status': { $ne: 'unverified' }
    }).select('firstname lastname email phoneNumber kyc')

    res.json(users)
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
