const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Cost Management API',
      version: '1.0.0',
      description: 'API documentation for Cost Management project',
    },
    servers: [{ url: 'http://localhost:3000' }],
  },
  apis: ['./routes/cm_master.js'], 
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

function setupSwagger(app) {
  app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
}

module.exports = setupSwagger;
