const Alert = require("../models/Alert");

exports.logAlert = async (req, res) => {
  const { lat, lng, zoneType } = req.body;

  if (!lat || !lng || !zoneType) {
    return res.status(400).json({ error: "lat, lng, and zoneType are required" });
  }

  try {
    const alert = new Alert({ lat, lng, zoneType });
    await alert.save();
    res.status(201).json({ message: "Alert logged successfully", alert });
  } catch (error) {
    console.error("❌ Error logging alert:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getAlerts = async (req, res) => {
  const { start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: "Start date and end date are required" });
  }

  try {
    const start = new Date(start_date);
    const end = new Date(end_date);
    end.setDate(end.getDate() + 1);

    const alerts = await Alert.find({ timestamp: { $gte: start, $lt: end } });
    res.json(alerts);
  } catch (error) {
    console.error("❌ Error fetching alerts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
