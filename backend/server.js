const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json'); // Ensure this points to the generated JSON file

const projectRoutes = require('./routes/employee');
const employeeRoutes = require('./routes/master');
const moduleRoutes = require('./routes/modeule');
const masterRoutes = require('./routes/project');

const app = express();

app.use(express.json());
app.use(cors()); // Allow all origins for testing

// Serve Swagger UI at /swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API routes
app.use('/costdata/', masterRoutes);
app.use('/costdata/', projectRoutes);
app.use('/costdata/', employeeRoutes);
app.use('/costdata/', moduleRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
