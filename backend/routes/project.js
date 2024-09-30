const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const { sendResponse } = require('../responseHelper');

// Configure MySQL connection
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
 *   - name: Projects
 *     description: API endpoints related to projects
 */

/**
 * @swagger
 * /costdata/getprojects:
 *   get:
 *     tags: [Projects]
 *     responses:
 *       200:
 *         description: List of projects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Projects fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ProjectID:
 *                         type: integer
 *                       ProjectName:
 *                         type: string
 *                       ProjectStart:
 *                         type: string
 *                         format: date-time
 *                       ProjectEnd:
 *                         type: string
 *                         format: date-time
 *                       ProjectStatus:
 *                         type: integer
 */
router.get('/getprojects', (req, res) => {
  connection.query('SELECT `ProjectID`, `ProjectName`, `ProjectStart`, `ProjectEnd`, `ProjectStatus` FROM `projects`', (err, results) => {
    if (err) {
      console.error('Error fetching projects:', err);
      return sendResponse(res, 500, 'error', 'An error occurred while fetching projects', null);
    }
    sendResponse(res, 200, 'success', 'Projects fetched successfully', results);
  });
});

/**
 * @swagger
 * /costdata/addproject:
 *   post:
 *     tags: [Projects]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ProjectName:
 *                 type: string
 *               ProjectStart:
 *                 type: string
 *                 format: date
 *               ProjectEnd:
 *                 type: string
 *                 format: date
 *               ProjectStatus:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Project created successfully
 */
router.post('/addproject', (req, res) => {
  const { ProjectName, ProjectStart, ProjectEnd, ProjectStatus } = req.body;

  const sql = 'INSERT INTO `projects` (`ProjectName`, `ProjectStart`, `ProjectEnd`, `ProjectStatus`) VALUES (?, ?, ?, ?)';
  const values = [ProjectName, ProjectStart, ProjectEnd, ProjectStatus];

  connection.query(sql, values, (err, results) => {
    if (err) {
      console.error('Error inserting data:', err);
      return sendResponse(res, 500, 'error', 'An error occurred while inserting data', null);
    }
    sendResponse(res, 201, 'success', 'Project inserted successfully', { ProjectID: results.insertId, ProjectName, ProjectStart, ProjectEnd, ProjectStatus });
  });
});

// Add other routes for update and delete projects here

module.exports = router;
