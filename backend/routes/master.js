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
 *   - name: Master
 */

/**
 * @swagger
 * /costdata/getdetail:
 *   get:
 *     tags: [Master]
 *     parameters:
 *       - name: ProjectID
 *         in: query
 *         description: Filter by ProjectID. Optional.
 *         required: false
 *         schema:
 *           type: integer
 *       - name: ProjectName
 *         in: query
 *         description: Filter by ProjectName. Optional.
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of projects with their modules and employees
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
 *                         format: date
 *                       ProjectEnd:
 *                         type: string
 *                         format: date
 *                       ProjectStatus:
 *                         type: integer
 *                       modules:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             ModuleID:
 *                               type: integer
 *                             ModuleName:
 *                               type: string
 *                             ModuleAddDate:
 *                               type: string
 *                               format: date
 *                             ModuleDueDate:
 *                               type: string
 *                               format: date
 *                             ModuleActive:
 *                               type: boolean
 *                       employees:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             EmployeeID:
 *                               type: integer
 *                             EmployeeName:
 *                               type: string
 *                             EmployeePosition:
 *                               type: string
 *                             EmployeeCost:
 *                               type: number
 *                               format: float
 *                   nullable: true
 *       500:
 *         description: An error occurred while fetching data
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
 *                   example: An error occurred while fetching data
 *                 data:
 *                   type: "null"
 *                   example: null
 */
router.get('/getdetail', (req, res) => {
    const { ProjectID, ProjectName } = req.query;
  
    let baseQuery = 'SELECT ProjectID, ProjectName, ProjectStart, ProjectEnd, ProjectStatus FROM projects';
    let whereClauses = [];
  
    if (ProjectID) whereClauses.push('ProjectID = ?');
    if (ProjectName) whereClauses.push('ProjectName LIKE ?');
    
    if (whereClauses.length > 0) {
      baseQuery += ' WHERE ' + whereClauses.join(' AND ');
    }
  
    connection.query(baseQuery, [ProjectID, `%${ProjectName}%`].filter(Boolean), (err, projects) => {
      if (err) {
        console.error('Error fetching projects:', err);
        return sendResponse(res, 500, 'error', 'An error occurred while fetching projects', null);
      }
  
      connection.query('SELECT ModuleID, ModuleName, ModuleAddDate, ModuleDueDate, ModuleActive, ProjectID FROM modules', (err, modules) => {
        if (err) {
          console.error('Error fetching modules:', err);
          return sendResponse(res, 500, 'error', 'An error occurred while fetching modules', null);
        }
  
        connection.query('SELECT e.EmployeeID, e.EmployeeName, e.EmployeePosition, e.EmployeeCost, ep.ProjectID FROM employees e JOIN employeeprojects ep ON e.EmployeeID = ep.EmployeeID', (err, employees) => {
          if (err) {
            console.error('Error fetching employees:', err);
            return sendResponse(res, 500, 'error', 'An error occurred while fetching employees', null);
          }
  
          // Map for projects
          const projectsMap = {};
  
          projects.forEach(project => {
            projectsMap[project.ProjectID] = {
              ...project,
              modules: [],
              employees: []
            };
          });
  
          // Add modules to the projects
          modules.forEach(module => {
            if (projectsMap[module.ProjectID]) {
              projectsMap[module.ProjectID].modules.push({
                ModuleID: module.ModuleID,
                ModuleName: module.ModuleName,
                ModuleAddDate: module.ModuleAddDate,
                ModuleDueDate: module.ModuleDueDate,
                ModuleActive: module.ModuleActive
              });
            }
          });
  
          // Add employees to the projects
          employees.forEach(employee => {
            if (projectsMap[employee.ProjectID]) {
              projectsMap[employee.ProjectID].employees.push({
                EmployeeID: employee.EmployeeID,
                EmployeeName: employee.EmployeeName,
                EmployeePosition: employee.EmployeePosition,
                EmployeeCost: employee.EmployeeCost
              });
            }
          });
  
          // Convert projectsMap to an array
          const projectsArray = Object.values(projectsMap);
  
          // Send the response
          sendResponse(res, 200, 'success', 'Projects fetched successfully', projectsArray);
        });
      });
    });
  });

module.exports = router;