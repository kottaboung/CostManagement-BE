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
 *       - in: query
 *         name: projectID
 *         schema:
 *           type: integer
 *         required: false
 *       - in: query
 *         name: projectName
 *         schema:
 *           type: string
 *         required: false
 *     responses:
 *       200:
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
 *                   example: Project details fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ProjectID:
 *                         type: integer
 *                         description: The unique ID of the project
 *                       ProjectName:
 *                         type: string
 *                         description: The name of the project
 *                       ProjectStart:
 *                         type: string
 *                         format: date-time
 *                         description: The start date of the project
 *                       ProjectEnd:
 *                         type: string
 *                         format: date-time
 *                         description: The end date of the project
 *                       ProjectStatus:
 *                         type: integer
 *                         description: The status of the project (e.g., 1 for active, 0 for inactive)
 *                       modules:
 *                         type: array
 *                         description: A list of modules under this project
 *                         items:
 *                           type: object
 *                           properties:
 *                             ModuleID:
 *                               type: integer
 *                               description: The unique ID of the module
 *                             ModuleName:
 *                               type: string
 *                               description: The name of the module
 *                             ModuleAddDate:
 *                               type: string
 *                               format: date-time
 *                               description: The date the module was added
 *                             ModuleDueDate:
 *                               type: string
 *                               format: date-time
 *                               description: The module's due date
 *                             ModuleActive:
 *                               type: boolean
 *                               description: Whether the module is active or not
 *                             employees:
 *                               type: array
 *                               description: A list of employees assigned to this module
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   EmployeeID:
 *                                     type: integer
 *                                     description: The unique ID of the employee
 *                                   EmployeeName:
 *                                     type: string
 *                                     description: The name of the employee
 *                                   EmployeePosition:
 *                                     type: string
 *                                     description: The position of the employee
 *                                   EmployeeCost:
 *                                     type: number
 *                                     format: float
 *                                     description: The cost associated with the employee
 *                       employees:
 *                         type: array
 *                         description: A list of employees assigned to the entire project but not tied to specific modules
 *                         items:
 *                           type: object
 *                           properties:
 *                             EmployeeID:
 *                               type: integer
 *                               description: The unique ID of the employee
 *                             EmployeeName:
 *                               type: string
 *                               description: The name of the employee
 *                             EmployeePosition:
 *                               type: string
 *                               description: The position of the employee
 *                             EmployeeCost:
 *                               type: number
 *                               format: float
 *                               description: The cost associated with the employee
 *                   nullable: true
 *       500:
 *         description: An error occurred while fetching project details
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
  const { projectID, projectName } = req.query;

  let projectQuery = `SELECT ProjectID, ProjectName, ProjectStart, ProjectEnd, ProjectStatus FROM projects`;
  let queryParams = [];

  if (projectID) {
    projectQuery += ` WHERE ProjectID = ?`;
    queryParams.push(projectID);
  } else if (projectName) {
    projectQuery += ` WHERE ProjectName LIKE ?`;
    queryParams.push(`%${projectName}%`);
  }

  connection.query(projectQuery, queryParams, (err, projects) => {
      if (err) {
          console.error('Error fetching projects:', err);
          return sendResponse(res, 500, 'error', 'An error occurred while fetching projects', null);
      }

      // Check if any projects exist
      if (projects.length === 0) {
          return sendResponse(res, 200, 'success', 'No projects found', []);
      }

      // Query to fetch all modules
      const modulesQuery = `
          SELECT ModuleID, ModuleName, ModuleAddDate, ModuleDueDate, ModuleActive, ProjectID 
          FROM modules`;

      connection.query(modulesQuery, (err, modules) => {
          if (err) {
              console.error('Error fetching modules:', err);
              return sendResponse(res, 500, 'error', 'An error occurred while fetching modules', null);
          }

          // Map for projects
          const projectsMap = {};

          // Map all projects
          projects.forEach(project => {
              projectsMap[project.ProjectID] = {
                  ...project,
                  modules: [] // Initialize empty modules array
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
                      ModuleActive: module.ModuleActive,
                      employees: [] // Initialize empty employees array for this module
                  });
              }
          });

         // Fetch employees for each project
const employeePromises = projects.map(project => {
  return new Promise((resolve, reject) => {
      // Query to fetch employees assigned to the project (from employeeprojects table)
      const projectEmployeeQuery = `
          SELECT e.EmployeeID, e.EmployeeName, e.EmployeePosition, e.EmployeeCost 
          FROM employees e 
          JOIN employeeprojects ep ON e.EmployeeID = ep.EmployeeID 
          WHERE ep.ProjectID = ?`;
      
      // Query to fetch employees assigned to specific modules (from employeemodules table)
      const moduleEmployeeQuery = `
          SELECT e.EmployeeID, e.EmployeeName, e.EmployeePosition, e.EmployeeCost, em.ModuleID 
          FROM employees e 
          JOIN employeemodules em ON e.EmployeeID = em.EmployeeID 
          WHERE em.ProjectID = ?`;
      
            // Execute both queries in parallel
            Promise.all([
                new Promise((res, rej) => {
                    connection.query(projectEmployeeQuery, [project.ProjectID], (err, projectEmployees) => {
                        if (err) return rej(err);
                        res(projectEmployees);
                    });
                }),
                new Promise((res, rej) => {
                    connection.query(moduleEmployeeQuery, [project.ProjectID], (err, moduleEmployees) => {
                        if (err) return rej(err);
                        res(moduleEmployees);
                    });
                })
            ]).then(([projectEmployees, moduleEmployees]) => {
                // Add employees to modules and project
                projectsMap[project.ProjectID].modules.forEach(module => {
                    // Employees explicitly assigned to the module
                    const assignedToModule = moduleEmployees.filter(emp => emp.ModuleID === module.ModuleID);
                    module.employees.push(...assignedToModule);
                });

                // Add employees not directly assigned to a module (assigned only to the project)
                const employeesNotInModules = projectEmployees.filter(emp => 
                    !moduleEmployees.some(modEmp => modEmp.EmployeeID === emp.EmployeeID)
                );

                // Assign employees to all modules of the project
                projectsMap[project.ProjectID].modules.forEach(module => {
                    module.employees.push(...employeesNotInModules);
                });

                resolve();
            }).catch(reject);
        });
      });

          // Wait for all employee queries to complete
          Promise.all(employeePromises)
              .then(() => {
                  const projectsArray = Object.values(projectsMap);
                  sendResponse(res, 200, 'success', 'Project details fetched successfully', projectsArray);
              })
              .catch(err => {
                  console.error('Error fetching employees:', err);
                  sendResponse(res, 500, 'error', 'An error occurred while fetching employees', null);
              });
      });
  });
});


/**
 * @swagger
 * /costdata/GetModuleDetail:
 *   get:
 *     tags: [Modules]
 *     parameters:
 *       - in: body
 *         name: projectDetails
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             ProjectID:
 *               type: integer
 *             ProjectName:
 *               type: string
 *     responses:
 *       200:
 *         schema:
 *           type: object
 *           properties:
 *             modules:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   ModuleID:
 *                     type: integer
 *                     description: The ID of the module
 *                   ModuleAddDate:
 *                     type: string
 *                     format: date-time
 *                     description: The date the module was added
 *                   ModuleDueDate:
 *                     type: string
 *                     format: date-time
 *                     description: The due date of the module
 *                   ModuleActive:
 *                     type: boolean
 *                     description: Indicates whether the module is active
 *                   employees:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         EmployeeID:
 *                           type: integer
 *                           description: The ID of the employee
 *                         EmployeeName:
 *                           type: string
 *                           description: The name of the employee
 *                         EmployeeCost:
 *                           type: number
 *                           format: float
 *                           description: The cost of the employee
 *                         EmployeePosition:
 *                           type: string
 *                           description: The position of the employee
 *       500:
 *         description: An error occurred while fetching projects, modules, or employees
 *         schema:
 *           type: object
 *           properties:
 *             status:
 *               type: string
 *               example: error
 *             message:
 *               type: string
 *               example: An error occurred while fetching projects
 *             error:
 *               type: string
 *               example: Detailed error message
 */
  router.get('/GetModuleDetail', (req, res) => {
    const { ProjectID, ProjectName } = req.body;
  
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
  
          // Prepare the response structure
          const response = {
            modules: []
          };
  
          // Map modules to response
          modules.forEach(module => {
            const moduleEntry = {
              ModuleID: module.ModuleID,
              ModuleAddDate: module.ModuleAddDate,
              ModuleDueDate: module.ModuleDueDate,
              ModuleActive: module.ModuleActive,
              employees: []                // Initialize empty employee array
            };
  
            // Add associated employees to the module
            employees.forEach(employee => {
              if (employee.ProjectID === module.ProjectID) {
                moduleEntry.employees.push({
                  EmployeeID: employee.EmployeeID,
                  EmployeeName: employee.EmployeeName,
                  EmployeeCost: employee.EmployeeCost,
                  EmployeePosition: employee.EmployeePosition
                });
              }
            });
  
            // Add moduleEntry to the response if it has employees
            response.modules.push(moduleEntry);
          });
  
          // Send the response
          sendResponse(res, 200, 'success', 'Projects fetched successfully', response);
        });
      });
    });
  });
  
  

module.exports = router;