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


router.get('/getemployees', (req, res) => {
    connection.query('SELECT `EmployeeID`, `EmployeeName`, `EmployeePosition`, `EmployeeCost` FROM `employees` ', (err, results) => {
        if (err) {
            console.error('Error fetching employees:', err);
            return sendResponse(res, 500, 'error', 'An error occurred while fetching employees', null);
          }
          sendResponse(res, 200, 'success', 'Employees fetched successfully', results);
    })
})


router.post('/injectemployee', (req, res) => {
  const { EmployeeID, ProjectID } = req.body;

  // Input validation
  if (!EmployeeID || !ProjectID) {
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

    // Success response
    res.status(200).json({
      status: 'success',
      message: 'Employee added to project successfully',
      data: { EmployeeID, ProjectID },
    });
  });
});

module.exports = router;