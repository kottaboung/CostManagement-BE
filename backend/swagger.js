const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'Cost Management API',
    description: 'API documentation for Cost Management project',
  },
  host: 'localhost:3000',
  schemes: ['http'],
};

// Change the outputFile to swagger.json
const outputFile = './swagger.json'; // Corrected to swagger.json
const endpointsFiles = [
  './routes/modeule.js',
  './routes/employee.js',
  './routes/project.js',
  './routes/master.js',
];

// Generate the Swagger documentation
swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
  require('./server');
});
