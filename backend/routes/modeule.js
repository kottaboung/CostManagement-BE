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

 
router.get('/GetAllModules', (req, res) => {
    connection.query('SELECT ModuleID, ModuleName, ModuleAddDate, ModuleDueDate, ModuleActive, ProjectID FROM modules', (err, response) => {
        if (err) {
          console.error('Error fetching modules:', err);
          return sendResponse(res, 500, 'error', 'An error occurred while fetching modules', null);
        }
        sendResponse(res, 200, 'success', 'Modules fetched successfully', response);
    });
});


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