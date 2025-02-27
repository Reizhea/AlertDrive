const axios = require("axios");

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

exports.getGoogleDirections = async (req, res) => {
    try {
        const { origin, destination } = req.query;

        if (!origin || !destination) {
            return res.status(400).json({ error: "Origin and destination are required" });
        }

        const response = await axios.get("https://maps.googleapis.com/maps/api/directions/json", {
            params: {
                origin,
                destination,
                key: GOOGLE_MAPS_API_KEY,
                departure_time: "now",
                traffic_model: "best_guess"
            }
        });

        const data = response.data;

        if (!data.routes || data.routes.length === 0) {
            return res.status(404).json({ error: "No route found" });
        }

        const route = data.routes[0];
        const leg = route.legs[0];

        const directionsData = {
            start: leg.start_location,
            end: leg.end_location,
            distance: leg.distance.value,
            duration: leg.duration.value,
            duration_in_traffic: leg.duration_in_traffic ? leg.duration_in_traffic.value : leg.duration.value,
            polyline: route.overview_polyline.points,
            waypoints: leg.steps.map(step => step.end_location),
            actions: leg.steps.map(step => ({
                instruction: step.html_instructions.replace(/<[^>]*>?/gm, ""),
                length: step.distance.value,
                duration: step.duration.value,
                direction: step.maneuver || "straight"
            }))
        };
        res.json(directionsData);

    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};
