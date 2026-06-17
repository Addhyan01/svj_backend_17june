const Membership = require('../models/Membership');
const Delivery = require('../models/Delivery');
const User = require('../models/User');

// @desc    Monthly batch processing engine to generate regular subscription tickets
// @route   POST /api/v1/scheduler/generate-monthly-cycle
exports.generateMonthlyCycleDeliveries = async (req, res) => {
  try {
    // 1. Authorization check
    if (req.user && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Unauthorized: Only Super Admin can manually trigger batch scripts.' });
    }

    // 2. Aaj ki date aur current month/year nikalna (Duplication check ke liye)
    const today = new Date();
    const currentMonth = today.getMonth(); // 0 = Jan, 4 = May, etc.
    const currentYear = today.getFullYear();

    // Start and End dates for the current month to scan existing tickets
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    // 3. Find all active SUBSCRIPTION memberships that have remaining balance
    const activeSubscriptions = await Membership.find({
      paymentStatus: 'success',
      isStaticBatchOrder: { $ne: true }, // Not an on-demand tree order
      expiresAt: { $gt: today } // Membership expired nahi honi chahiye
    }).populate('serviceId memberId');

    let ticketsCreated = 0;
    let skippedAccounts = 0;

    // 4. Iterate through each subscription profile
    for (const sub of activeSubscriptions) {
      // Check if user object exists and is active
      if (!sub.memberId || sub.memberId.status !== 'active') {
        skippedAccounts++;
        continue;
      }

      // Quota check logic
      const remainingBalance = sub.totalUnitsEntitled - sub.unitsClaimed;
      if (remainingBalance <= 0) {
        skippedAccounts++;
        continue;
      }

      // STRICT DUPLICATION GUARD: Check if this member already has a regular ticket for this month
      const existingTicket = await Delivery.findOne({
        memberId: sub.memberId._id,
        'services.serviceId': sub.serviceId._id,
        deliveryType: 'REGULAR',
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      });

      if (existingTicket) {
        skippedAccounts++;
        continue; // Is mahine ka ticket pehle se hi bana hua hai (e.g. at account activation)
      }

      // 5. Deduct 1 unit count from subscription allocation matrix
      sub.unitsClaimed += 1;
      await sub.save();

      // 6. Generate the standard monthly delivery ticket
      await Delivery.create({
        memberId: sub.memberId._id,
        blockId: sub.memberId.blockId,
        services: [{
          serviceId: sub.serviceId._id,
          quantity: 1 // Regular monthly distribution quantity
        }],
        deliveryType: 'REGULAR',
        status: 'pending',
        notes: `Automated monthly subscription dispatch log for Month: ${currentMonth + 1}/${currentYear}. Target timeline: 25th-30th.`
      });

      ticketsCreated++;
    }

    return res.status(200).json({
      success: true,
      message: "Monthly batch simulation completed successfully.",
      summary: {
        totalSubscriptionsScanned: activeSubscriptions.length,
        ticketsGenerated: ticketsCreated,
        accountsSkippedOrAlreadyProcessed: skippedAccounts
      }
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};