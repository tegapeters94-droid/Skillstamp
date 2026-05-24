// SkillStamp — Cloud Functions Entry Point
// Initializes Firebase Admin and exports all callable functions.
// Each module is imported separately so failures in one do not
// prevent other functions from deploying.

'use strict';

const { initializeApp } = require('firebase-admin/app');

// Initialize Firebase Admin SDK once
initializeApp();

// ── Messaging ─────────────────────────────────────────────────────────────
const { validateAndSendMessage } = require('./messaging/messageGuard');
exports.validateAndSendMessage = validateAndSendMessage;

// ── Analytics ─────────────────────────────────────────────────────────────
const { trackAnalyticsEvent } = require('./analytics/trackEvent');
exports.trackAnalyticsEvent = trackAnalyticsEvent;

// ── Admin Actions ──────────────────────────────────────────────────────────
const {
  adminToggleBan,
  adminSetBadge,
  adminVerificationDecision,
  adminGetAnalytics,
} = require('./admin/adminActions');
exports.adminToggleBan             = adminToggleBan;
exports.adminSetBadge              = adminSetBadge;
exports.adminVerificationDecision  = adminVerificationDecision;
exports.adminGetAnalytics          = adminGetAnalytics;

// ── Gig / Payments ─────────────────────────────────────────────────────────
const { releasePayment } = require('./gigs/releasePayment');
exports.releasePayment = releasePayment;
