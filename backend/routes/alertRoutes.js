const express = require("express");
const router = express.Router();
const alertController = require("../controllers/alertController");

router.post("/alerts", alertController.logAlert);
router.get("/alerts/all", alertController.getAlerts);

module.exports = router;
