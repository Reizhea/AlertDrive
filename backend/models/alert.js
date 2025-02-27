const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  zoneType: { type: String, enum: ["Red", "Yellow"], required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Alert", alertSchema);
