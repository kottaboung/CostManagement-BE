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

router.get('/getprojects', (req, res) => {
  connection.query('SELECT `ProjectID`, `ProjectName`, `ProjectStart`, `ProjectEnd`, `ProjectStatus` FROM `projects`', (err, results) => {
    if (err) {
      console.error('Error fetching projects:', err);
      return sendResponse(res, 500, 'error', 'An error occurred while fetching projects', null);
    }
    sendResponse(res, 200, 'success', 'Projects fetched successfully', results);
  });
});


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
