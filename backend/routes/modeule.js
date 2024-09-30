const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const { sendResponse } = require('../responseHelper');

const connection = mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'cost_database'
  });

  /**
 * @swagger
 * tags:
 *   - name: Modules
 */

/**
 * @swagger
 * /costdata/GetAllModules:
 *   get:
 *     tags: 
 *       - Modules
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ModuleID:
 *                         type: integer
 *                       ModuleName:
 *                         type: string
 *                       ModuleAddDate:
 *                         type: string
 *                         format: date-time
 *                       ModuleDueDate:
 *                         type: string
 *                         format: date-time
 *                       ModuleActive:
 *                         type: boolean
 *                       ProjectID:
 *                         type: integer
 *       500:
 *         description: Error fetching modules
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: An error occurred while fetching modules
 *                 data:
 *                   type: "null"
 */
router.get('/GetAllModules', (req, res) => {
    connection.query('SELECT ModuleID, ModuleName, ModuleAddDate, ModuleDueDate, ModuleActive, ProjectID FROM modules', (err, response) => {
        if (err) {
          console.error('Error fetching modules:', err);
          return sendResponse(res, 500, 'error', 'An error occurred while fetching modules', null);
        }
        sendResponse(res, 200, 'success', 'Modules fetched successfully', response);
    });
});

/**
 * @swagger
 * /costdata/CreateNewModule:
 *   post:
 *     tags: [Modules]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ModuleName:
 *                 type: string
 *               ModuleAddDate:
 *                 type: string
 *                 format: date
 *               ModuleDueDate:
 *                 type: string
 *                 format: date
 *               ModuleActive:
 *                  type: boolean
 *               ProjectID:
 *                  type: integer
 *     responses:
 *       201:
 *         description: Module created successfully
 *       500:
 *         description: Error occurred while creating module
 */
router.post('/CreateNewModule', (req, res) => {
    const { ModuleName , ModuleAddDate, ModuleDueDate , ModuleActive , ProjectID } = req.body

    const sql = 'INSERT INTO `modules` (`ModuleName`, `ModuleAddDate`, `ModuleDueDate`, `ModuleActive`, `ProjectID`) VALUES (?, ?, ?, ?, ?)';
    const values = [ModuleName , ModuleAddDate, ModuleDueDate , ModuleActive , ProjectID];

    connection.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error Create Module:', err);
            return sendResponse(res, 500, 'error', 'An error occurred while inserting module', null);
          }
          sendResponse(res, 201, 'success', 'Module created successfully', { ModuleName , ModuleAddDate, ModuleDueDate , ModuleActive , ProjectID });
    })
})


module.exports = router;