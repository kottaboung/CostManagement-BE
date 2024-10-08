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
 *   - name: Employees
 *     description: API endpoints related to employees
 */

/**
 * @swagger
 * /costdata/addemployee:
 *   post:
 *     tags: [Employees]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               EmployeeName:
 *                 type: string
 *               EmployeePosition:
 *                 type: string
 *               EmployeeCost:
 *                 type: number
 *     responses:
 *       201:
 *         description: Employee created successfully
 *       500:
 *         description: Error occurred while creating employee
 */

router.post('/addemployee', (req, res) => {
    const { EmployeeName, EmployeePosition, EmployeeCost } = req.body;
  
    const sql = 'INSERT INTO `employees` (`EmployeeName`, `EmployeePosition`, `EmployeeCost`) VALUES (?, ?, ?)';
    const values = [EmployeeName, EmployeePosition, EmployeeCost];
  
    connection.query(sql, values, (err, results) => {
      if (err) {
        console.error('Error inserting employee:', err);
        return sendResponse(res, 500, 'error', 'An error occurred while inserting employee', null);
      }
      sendResponse(res, 201, 'success', 'Employee created successfully', { EmployeeID: results.insertId, EmployeeName, EmployeePosition, EmployeeCost });
    });
  });

/**
 * @swagger
 * /costdata/getemployees:
 *   get:
 *     tags: [Employees]
 *     responses:
 *       200:
 *         description: List of employees
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
 *                   example: Employees fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       EmployeeName:
 *                          type: string
 *                       EmployeePosition:
 *                          type: string
 *                       EmployeeCost:
 *                          type: integer
 */
router.get('/getemployees', (req, res) => {
    connection.query('SELECT `EmployeeID`, `EmployeeName`, `EmployeePosition`, `EmployeeCost` FROM `employees` ', (err, results) => {
        if (err) {
            console.error('Error fetching employees:', err);
            return sendResponse(res, 500, 'error', 'An error occurred while fetching employees', null);
          }
          sendResponse(res, 200, 'success', 'Employees fetched successfully', results);
    })
})

/**
 * @swagger
 * /costdata/injectemployee:
 *   post:
 *     tags: [Employees]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               EmployeeID:
 *                 type: integer
 *               ProjectID:
 *                 type: integer
 *             required:
 *               - EmployeeID
 *               - ProjectID
 *     responses:
 *       201:
 *         description: Employee added successfully
 *       500:
 *         description: Error occurred while adding employee
 */
router.post('/injectemployee', (req, res) => {
  const { EmployeeID, ProjectID } = req.body;

  // Input validation
  if (EmployeeID === undefined || ProjectID === undefined) {
    return res.status(400).json({
      status: 'error',
      message: 'EmployeeID and ProjectID are required fields',
    });
  }

  const sql = 'INSERT INTO `employeeprojects` (`EmployeeID`, `ProjectID`) VALUES (?, ?)';
  const values = [EmployeeID, ProjectID];

  connection.query(sql, values, (err, results) => {
    if (err) {
      console.error('Error inserting employee:', err);
      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while inserting the employee into the project',
        error: err.message,
      });
    }

    // Corrected to use `results` instead of `results`
    sendResponse(res, 201, 'success', 'Employee added successfully', { EmployeeProjectID: results.insertId, EmployeeID, ProjectID });
  });
});



/**
 * @swagger
 * /costdata/AddEmployeeToModule:
 *   post:
 *     tags: [Employees]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               EmployeeID:
 *                 type: integer
 *               ModuleID:
 *                 type: integer
 *               ProjectID:
 *                 type: integer
 *             required:
 *               - EmployeeID
 *               - ModuleID
 *               - ProjectID
 *     responses:
 *       201:
 *         description: Employee added successfully
 *       500:
 *         description: Error occurred while adding employee
 */

router.post('/AddEmployeeToModule', (req, res) => {
  const { EmployeeID, ModuleID, ProjectID } = req.body;

  // Fixed the condition here to check all required fields
  if (EmployeeID === undefined || ModuleID === undefined || ProjectID === undefined) {
    return res.status(400).json({
      status: 'error',
      message: 'EmployeeID, ModuleID, and ProjectID are required fields',
    });
  }

  const sql = 'INSERT INTO `employeemodules` (`EmployeeID`, `ModuleID`, `ProjectID`) VALUES (?, ?, ?)';
  const values = [EmployeeID, ModuleID, ProjectID];

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error inserting employee:', err);
      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while inserting the employee into the module',
        error: err.message,
      });
    }

    // Corrected to use `result` instead of `results`
    sendResponse(res, 201, 'success', 'Employee added successfully', { EmployeeModuleID: result.insertId, EmployeeID, ModuleID, ProjectID });
  });
});


module.exports = router;