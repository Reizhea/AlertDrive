const express = require("express");
const { getGoogleDirections } = require("../controllers/mapController");

const router = express.Router();

// Route to get Google Directions (with traffic data)
router.get("/navigation/directions", getGoogleDirections);

module.exports = router;
