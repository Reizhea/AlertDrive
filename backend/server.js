require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const zoneRoutes = require('./routes/zoneRoutes');
const alertRoutes = require('./routes/alertRoutes');
const mapRoutes = require("./routes/mapRoutes");

const app = express();

app.use(cors());
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log('MongoDB connection error:', err));

app.use('/api', zoneRoutes);
app.use('/api', alertRoutes);
app.use("/api", mapRoutes);
app.get('/api/status', (req, res) => res.json({ status: "OK" }));

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
