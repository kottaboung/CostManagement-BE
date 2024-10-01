const express = require('express');
const cors = require('cors');
const setupSwagger = require('./swagger');
const projectRoutes = require('./routes/project');
const employeeRoutes = require('./routes/employee');
const moduleRoutes = require('./routes/modeule');
//const eventRoutes = require('./routes/event');
const masterRoutes = require('./routes/master');
const master2Routes = require('./routes/cm_master');

const app = express();

app.use(express.json());
app.use(cors()); // Allow all origins for testing

// Swagger setup
setupSwagger(app);

const head = "/costdata"

// API routes
// app.use(head +'/', masterRoutes);
// app.use(head +'/', projectRoutes);
// app.use(head +'/', employeeRoutes);
// app.use(head +'/', moduleRoutes);
app.use(head +'/', master2Routes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
