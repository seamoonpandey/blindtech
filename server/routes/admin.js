const express = require('express');
const router = express.Router();
const { exec } = require('child_process');

// POST /admin/reset-db
router.post('/reset-db', async (req, res) => {
  // Optionally, add authentication/authorization checks here
  exec('node server/scripts/reset-db.js', (error, stdout, stderr) => {
    if (error) {
      console.error('Reset DB error:', error);
      return res.status(500).json({ success: false, error: stderr || error.message });
    }
    res.json({ success: true, output: stdout });
  });
});

module.exports = router;
