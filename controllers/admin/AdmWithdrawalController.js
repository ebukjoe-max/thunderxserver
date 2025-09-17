import Transactions from '../../models/Transaction.js'
import WithdrawalModel from '../../models/withdrawal.js'
import sendEmail from '../../utilities/sendEmail.js'

// Get all withdrawals
export const getWithdrawals = async (req, res) => {
  try {
    const withdrawals = await WithdrawalModel.find()
      .populate('userId', 'firstname lastname email')
      .populate('transactionId')
      .sort({ createdAt: -1 })

    res.json(withdrawals)
  } catch (err) {
    console.error('Error fetching withdrawals:', err)
    res.status(500).json({ message: err.message })
  }
}

export const updateWithdrawalStatus = async (req, res) => {
  // console.log(req.body)
  try {
    const { status } = req.body // "approved" | "rejected" | "pending"
    const withdrawal = await WithdrawalModel.findById(req.params.id).populate(
      'userId'
    )

    if (!withdrawal)
      return res.status(404).json({ message: 'Withdrawal not found' })

    // ✅ Update withdrawal status
    withdrawal.status = status
    if (status === 'success') {
      withdrawal.approvedAt = new Date()
    } else {
      withdrawal.approvedAt = null
    }
    await withdrawal.save()

    // ✅ Map withdrawal status → transaction status
    let txStatus = 'pending'
    if (status === 'success') txStatus = 'success'
    if (status === 'rejected') txStatus = 'failed'

    await Transactions.findByIdAndUpdate(withdrawal.transactionId, {
      status: txStatus
    })

    // ✅ Notify user
    if (withdrawal.userId?.email) {
      let subject = 'Withdrawal Update'
      let body = ''

      if (status === 'success') {
        subject = 'Withdrawal Approved'
        body = `
          <p>Hi <b>${withdrawal.userId.firstname}</b>,</p>
          <p>Your withdrawal of <b>$${withdrawal.amount} worth of ${withdrawal.coin}</b> through<b>${withdrawal.method}</b> has been <span style="color:green"><b>approved</b></span>.</p>
          <p>The funds will be available shortly.</p>
        `
      } else if (status === 'rejected') {
        subject = 'Withdrawal Rejected'
        body = `
          <p>Hi <b>${withdrawal.userId.firstname}</b>,</p>
          <p>Your withdrawal of <b>$${withdrawal.amount} worth of ${withdrawal.coin}</b> through<b>${withdrawal.method}</b> has been <span style="color:red"><b>rejected</b></span>.</p>
          <p>Please contact support if you believe this was a mistake.</p>
        `
      } else {
        subject = 'Withdrawal Pending'
        body = `
          <p>Hi <b>${withdrawal.userId.firstname}</b>,</p>
          <p>Your withdrawal of <b>$${withdrawal.amount} worth of ${withdrawal.coin}</b> is still <b>pending</b> review.</p>
        `
      }

      await sendEmail(withdrawal.userId.email, subject, body)
    }

    // ✅ Notify Admin (optional)
    if (process.env.ADMIN_EMAIL) {
      await sendEmail(
        process.env.ADMIN_EMAIL,
        `Withdrawal ${status.toUpperCase()} - ${withdrawal._id}`,
        `
          <p>Withdrawal status has been updated:</p>
          <ul>
            <li><b>User:</b> ${withdrawal.userId.firstname} ${withdrawal.userId.lastname} (${withdrawal.userId.email})</li>
            <li><b>Amount:</b> ${withdrawal.amount} ${withdrawal.coin}</li>
            <li><b>Method:</b> ${withdrawal.method}</li>
            <li><b>Status:</b> ${status}</li>
          </ul>
        `
      )
    }

    res.json({ success: true, withdrawal })
  } catch (err) {
    console.error('Error updating withdrawal:', err)
    res.status(500).json({ message: err.message })
  }
}
