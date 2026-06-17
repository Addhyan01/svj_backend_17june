const express = require('express');
const router = express.Router();
const schedulerController = require('../controllers/scheduler.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware'); // JWT auth middleware for protected routes and role-based access control

// Manual batch trigger portal protected under admin guardrails
router.post(
  '/generate-monthly-cycle',
  protect,
  restrictTo('SUPER_ADMIN'),
  schedulerController.generateMonthlyCycleDeliveries
);

module.exports = router;