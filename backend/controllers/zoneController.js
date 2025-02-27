const mongoose = require('mongoose');
const RedZone = mongoose.connection.collection('red_zones');
const YellowZone = mongoose.connection.collection('yellow_zones');

exports.checkLocation = async (req, res) => {
  const { lat, lng } = req.body;

  try {
    const query = {
      "geometry": {
        $geoIntersects: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
          }
        }
      }
    };

    const redZone = await RedZone.findOne(query);
    if (redZone) {
      return res.json({ zone: "Red", message: "You are in a high accident-prone area!" });
    }

    const yellowZone = await YellowZone.findOne(query);
    if (yellowZone) {
      return res.json({ zone: "Yellow", message: "Caution: You are in a moderate accident-prone area." });
    }

    return res.json({ zone: "None", message: "You are in a safe zone." });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


