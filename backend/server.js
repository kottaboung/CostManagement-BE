const express = require('express');
const cors = require('cors');
const setupSwagger = require('./swagger');
const master = require('./routes/cm_master');

const app = express();

app.use(express.json());
app.use(cors()); // Allow all origins for testing

// Swagger setup
setupSwagger(app);

app.use('/costdata', master);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});