const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  swaggerDefinition: {
      openapi: '3.0.0',
      info: {
          title: 'API Documentation',
          version: '1.0.0',
          description: 'API Documentation for Cost Management Application',
      },
      servers: [
          {
              url: 'http://localhost:3000', 
          },
      ],
  },
  apis: ['./routes/cm_master.js'], 
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

function setupSwagger(app) {
  app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
}

module.exports = setupSwagger;