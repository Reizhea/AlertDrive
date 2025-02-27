const express = require('express');
const router = express.Router();
const zoneController = require('../controllers/zoneController');

router.post('/check-location', zoneController.checkLocation);

module.exports = router;
