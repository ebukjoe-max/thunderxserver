import LoanPlan from '../../models/LoanPlanModel.js'
import Loan from '../../models/LoanModel.js'
import Transactions from '../../models/Transaction.js'
import UserWallet from '../../models/UserWallet.js'

// import UserWallet from '../../models/UserWallet.js'

export const createLoanPlan = async (req, res) => {
  console.log('Creating loan plan:', req.body)
  try {
    const newLoanPlan = await LoanPlan.create(req.body)
    res.status(201).json({ status: 'ok', data: newLoanPlan })
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message })
  }
}

export const getAllLoanPlans = async (req, res) => {
  try {
    const loanPlans = await LoanPlan.find().sort({ createdAt: -1 })
    res.status(200).json({ status: 'ok', data: loanPlans })
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message })
  }
}

// ✅ Delete loan
export const deleteLoan = async (req, res) => {
  try {
    await LoanPlan.findByIdAndDelete(req.params.id)
    res.status(200).json({ status: 'ok', message: 'Loan deleted' })
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message })
  }
}

// ✅ Update loan
export const updateLoan = async (req, res) => {
  try {
    const loan = await LoanPlan.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    })
    res.status(200).json({ status: 'ok', data: loan })
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message })
  }
}

export const applyForLoan = async (req, res) => {
  // console.log('Applying for loan:', req.body)
  try {
    const { userId, walletId, loanId, amount, documentUrl } = req.body

    if (!userId || !walletId || !loanId || !amount || !documentUrl) {
      return res.status(400).json({
        status: 'error',
        message: 'All fields are required'
      })
    }

    // Check for active loan
    const existingLoan = await Loan.findOne({
      userId,
      status: { $in: ['Pending', 'Approved'] }
    })
    if (existingLoan) {
      return res.status(403).json({
        status: 'error',
        message:
          'You already have an active or pending loan. Please settle it before applying for a new one.'
      })
    }

    // Find loan plan
    const loanPlan = await LoanPlan.findOne({ _id: loanId })
    if (!loanPlan) {
      return res
        .status(404)
        .json({ status: 'error', message: 'Loan plan not found' })
    }

    // Find wallet to get symbol
    const wallet = await UserWallet.findById(walletId)
    if (!wallet) {
      return res
        .status(404)
        .json({ status: 'error', message: 'Wallet not found' })
    }

    // Calculate interest
    const interestRate = loanPlan.interestRate / 100
    const interest = amount * interestRate
    const totalRepayment = amount + interest

    // Calculate due date
    let dueDate = new Date()
    if (loanPlan.durationType === 'months') {
      dueDate.setMonth(dueDate.getMonth() + loanPlan.duration)
    } else {
      dueDate.setDate(dueDate.getDate() + loanPlan.duration)
    }

    // Create loan
    const loan = await Loan.create({
      userId,
      walletId,
      loanId,
      amount,
      interest,
      totalRepayment,
      term: `${loanPlan.duration} ${loanPlan.durationType}`,
      documentUrl,
      dueDate,
      status: 'Pending'
    })

    // Log transaction with wallet.symbol
    // const tx = await Transaction.create({
    //   userId,
    //   amount,
    //   coin: wallet.symbol, // ✅ use wallet symbol here
    //   type: 'Loan',
    //   status: 'pending',
    //   method: 'Wallet',
    //   receipt: documentUrl
    // })

    return res.status(201).json({
      status: 'ok',
      message: 'Loan application submitted successfully',
      data: loan
    })
  } catch (err) {
    console.error('Loan application error:', err)
    res.status(500).json({ status: 'error', message: err.message })
  }
}

// controllers/loanController.js
export const getLoanHistory = async (req, res) => {
  try {
    const { userId } = req.params

    const loans = await Loan.find({ userId })
      .populate('loanId') // get LoanPlan details
      .populate('walletId') // get UserWallet details
      .sort({ createdAt: -1 })

    res.status(200).json(loans)
  } catch (err) {
    console.error('Error fetching loan history:', err)
    res.status(500).json({ status: 'error', message: err.message })
  }
}

export const getAllUsersLoans = async (req, res) => {
  try {
    const loans = await Loan.find()
      .populate('userId', 'firstname lastname email') // get User details
      .populate('loanId') // get LoanPlan details
      .populate('walletId') // get UserWallet details
      .sort({ createdAt: -1 })
    res.status(200).json(loans)
  } catch (err) {
    console.error('Error fetching all users loans:', err)
    res.status(500).json({ status: 'error', message: err.message })
  }
}

// PATCH: Approve loan
export const approveLoan = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
    if (!loan) return res.status(404).json({ error: 'Loan not found' })

    if (req.body.status === 'Approved') {
      loan.status = 'Approved'
      await loan.save()

      // Add amount to wallet
      const wallet = await UserWallet.findById(loan.walletId)
      if (wallet) {
        wallet.balance += loan.amount
        await wallet.save()
      }

      // Create a transaction for approval
      const tx = await Transactions.create({
        userId: loan.userId,
        loanId: loan._id,
        amount: loan.amount,
        coin: wallet.symbol,
        type: 'Loan',
        status: 'success',
        method: 'Wallet',
        action: 'Approved',
        receipt: loan.documentUrl || undefined
      })

      return res.json({
        message: 'Loan approved, wallet updated, transaction logged',
        transaction: tx
      })
    }

    if (req.body.status === 'Rejected') {
      loan.status = 'Rejected'
      await loan.save()

      // Create a transaction for rejection
      const tx = await Transaction.create({
        userId: loan.userId,
        loanId: loan._id,
        amount: loan.amount,
        coin: loan.walletId?.symbol || undefined,
        type: 'Loan',
        status: 'failed',
        method: 'Wallet',
        action: 'Rejected',
        receipt: loan.documentUrl || undefined
      })

      return res.json({
        message: 'Loan rejected, transaction logged',
        transaction: tx
      })
    }

    // Edit loan (amount/status)
    if (req.body.amount !== undefined) loan.amount = req.body.amount
    if (req.body.status !== undefined) loan.status = req.body.status
    await loan.save()
    res.json({ message: 'Loan updated', loan })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
}

// DELETE: Delete loan
export const deleteUserLoan = async (req, res) => {
  try {
    await Loan.findByIdAndDelete(req.params.id)
    res.json({ message: 'Loan deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
}

// PATCH: Add collateral to wallet (used after approval if needed)
export const addCollateral = async (req, res) => {
  try {
    const { userId, walletId, amount } = req.body

    const wallet = await UserWallet.findOne({ _id: walletId, userId })
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' })
    wallet.balance += amount
    await wallet.save()
    res.json({ message: 'Collateral added', balance: wallet.balance })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
}
