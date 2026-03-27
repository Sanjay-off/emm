const express = require('express');
const router  = express.Router();

const { handleResetPassword, handleAnnouncement } = require('../controllers/emailController');
const { handleCreateTemplate, handleGetTemplate } = require('../controllers/templateController');

// ── Template routes ───────────────────────────────────────
router.post('/templates',      handleCreateTemplate);
router.get('/templates/:key',  handleGetTemplate);

// ── Email routes ──────────────────────────────────────────
router.post('/email/reset-password', handleResetPassword);
router.post('/email/announcement',   handleAnnouncement);

module.exports = router;