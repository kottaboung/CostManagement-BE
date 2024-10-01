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
  database: 'cm_database'
});

/**
 * @swagger
 * tags:
 *   - name: Master2
 */

/**
 * @swagger
 * tags:
 *  - name: Project2
 */

/**
 * @swagger
 * tags:
 *  - name: Employee2
 */

/**
 * @swagger
 * tags:
 *  - name: Module2
 */


/**
 * @swagger
 * /costdata/GetAllProjects:
 *   get:
 *     tags:
 *       - Project2  # Correctly formatted tag
 *     summary: Retrieve all projects or filter by projectId or projectName
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: integer
 *         required: false
 *         description: The ID of the project to filter by
 *       - in: query
 *         name: projectName
 *         schema:
 *           type: string
 *         required: false
 *         description: The name of the project to filter by
 *     responses:
 *       200:
 *         description: Successfully fetched projects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   ProjectID:
 *                     type: integer
 *                   ProjectName:
 *                     type: string
 *                   ProjectStart:
 *                     type: string
 *                     format: date
 *                   ProjectEnd:
 *                     type: string
 *                     format: date
 *                   ProjectStatus:
 *                     type: number
 *                   ProjectCost:
 *                     type: number
 *       500:
 *         description: An error occurred while fetching projects
 */
router.get('/GetAllProjects', (req, res) => {
    const { ProjectId, ProjectName } = req.query;
    let projectQuery = `SELECT ProjectId, ProjectName, ProjectStart, ProjectEnd, ProjectStatus FROM Projects`;
    const params = [];

    if (ProjectId) {
        projectQuery += ` WHERE ProjectId = ?`;
        params.push(ProjectId);
    } else if (ProjectName) {
        projectQuery += ` WHERE ProjectName LIKE ?`;
        params.push(`%${ProjectName}%`);
    }

    connection.query(projectQuery, params, (err, projects) => {
        if (err) {
            console.error('Error fetching projects', err);
            return sendResponse(res, 500, 'error', 'Error fetching projects', null);
        }

        if (projects.length === 0) {
            return sendResponse(res, 200, 'success', 'No Project Found', []);
        }

        const projectPromises = projects.map(project => {
            return new Promise((resolve, reject) => {
                const modulesQuery = `SELECT ModuleId, ModuleAddDate, ModuleDueDate FROM Modules WHERE ProjectId = ?`;

                connection.query(modulesQuery, [project.ProjectId], (err, modules) => {
                    if (err) {
                        console.error('Error fetching modules', err);
                        return reject(err);
                    }

                    let totalProjectCost = 0;

                    if (modules.length === 0) {
                        // If no modules, set ProjectCost to 0
                        project.ProjectCost = 0;
                        return resolve(project);
                    }

                    const moduleCostPromises = modules.map(module => {
                        return new Promise((modResolve, modReject) => {
                            const startDate = new Date(module.ModuleAddDate);
                            const endDate = new Date(module.ModuleDueDate);
                            const mandays = (endDate - startDate) / (1000 * 60 * 60 * 24);

                            const employeeQuery = `SELECT e.EmployeeId, e.EmployeeCost FROM Employees e
                                                    JOIN Module_Employees em ON e.EmployeeId = em.EmployeeId
                                                    WHERE em.ModuleId = ?`;

                            connection.query(employeeQuery, [module.ModuleId], (err, employees) => {
                                if (err) {
                                    return modReject(err);
                                }

                                let moduleCost = 0;
                                employees.forEach(employee => {
                                    moduleCost += employee.EmployeeCost * mandays;
                                });

                                totalProjectCost += moduleCost;
                                modResolve();
                            });
                        });
                    });

                    Promise.all(moduleCostPromises).then(() => {
                        project.ProjectCost = totalProjectCost;
                        resolve(project);
                    })
                    .catch(modErr => reject(modErr));
                });
            });
        });

        Promise.all(projectPromises)
            .then(projectWithCosts => {
                sendResponse(res, 200, 'success', 'Projects fetched successfully', projectWithCosts);
            })
            .catch(err => {
                console.error('Error calculating project cost', err);
                sendResponse(res, 500, 'error', 'Error calculating project cost', null);
            });
    });
});



/**
 * @swagger
 * /costdata/CreateNewProject:
 *   post:
 *     tags:
 *       - Project2
 *     summary: Create a new project
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ProjectName:
 *                 type: string
 *                 example: "New Project"
 *               ProjectStart:
 *                 type: string
 *                 format: date
 *                 example: "2024-09-01"
 *               ProjectEnd:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-31"
 *               ProjectStatus:
 *                 type: number
 *                 example: 0
 *               ProjectCost:
 *                 type: number
 *                 example: 0
 *                 description: Optional, defaults to 0
 *     responses:
 *       201:
 *         description: Project created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ProjectID:
 *                   type: integer
 *                 ProjectName:
 *                   type: string
 *                 ProjectStart:
 *                   type: string
 *                   format: date
 *                 ProjectEnd:
 *                   type: string
 *                   format: date
 *                 ProjectStatus:
 *                   type: number
 *                 ProjectCost:
 *                   type: number
 *       500:
 *         description: An error occurred while inserting the project
 */
router.post('/CreateNewProject', (req, res) => {
    const { ProjectName, ProjectStart, ProjectEnd, ProjectStatus, ProjectCost = 0 } = req.body;

    const sql = 'INSERT INTO `Projects` (`ProjectName`, `ProjectStart`, `ProjectEnd`, `ProjectStatus`, `ProjectCost`) VALUES (?, ?, ?, ?, ?)';
    const values = [ProjectName, ProjectStart, ProjectEnd, ProjectStatus, ProjectCost];

    connection.query(sql, values, (err, results) => {
        if (err) {
            console.error('Error inserting data:', err);
            return sendResponse(res, 500, 'error', 'An error occurred while inserting data', null);
        }
        sendResponse(res, 201, 'success', 'Project inserted successfully', { 
            ProjectId: results.insertId, 
            ProjectName, 
            ProjectStart, 
            ProjectEnd, 
            ProjectStatus, 
            ProjectCost 
        });
    });
});


/**
 * @swagger
 * /costdata/CreateNewEmployee:
 *  post:
 *      tags:
 *      - Employee2
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          EmployeeName:
 *                              type: string
 *                              example: "New Employee"
 *                          EmployeePosition:
 *                              type: string
 *                              example: "Developer"
 *                          EmployeeCost:
 *                              type: number
 *                              format: float
 *                              example: 3000.00
 *      responses:
 *          200:
 *              description: Employee created successfully
 *              content: 
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              EmployeeId:
 *                                  type: integer
 *                              EmployeeName:
 *                                  type: string
 *                              EmployeePosition:
 *                                  type: string
 *                              EmployeeCost:
 *                                  type: number
 *                                  format: float
 *          500:
 *              description: Error creating employee
 */
router.post('/CreateNewEmployee', (req, res) => {
    const { EmployeeName, EmployeePosition, EmployeeCost } = req.body;

    if (!EmployeeName || !EmployeePosition || EmployeeCost == null) {
        return sendResponse(res, 400, 'error', 'Missing required fields', null);
    }

    const sql = 'INSERT INTO `Employees` (`EmployeeName`, `EmployeePosition`, `EmployeeCost`) VALUES (?, ?, ?)';
    const values = [EmployeeName, EmployeePosition, EmployeeCost];

    connection.query(sql, values, (err, result) => {
        if(err) {
            console.error('Error Create New Employee', err );
            return sendResponse(res, 500, 'error', 'Error creating new employee', null);
        }
        sendResponse(res, 200, 'success', 'Created new employee success', {
            EmployeeId: result.insertId,
            EmployeeName,
            EmployeePosition,
            EmployeeCost
        });
    });
});

/**
 * @swagger
 * /costdata/InjectEmployeeToProject:
 *  post:
 *      tags:
 *      - Employee2
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          EmployeeId:
 *                              type: integer
 *                              example: 1
 *                          ProjectId:
 *                              type: integer
 *                              example: 1
 *      responses:
 *          201:
 *              description: Employee added to Project successfully
 *              content: 
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              EmployeeId:
 *                                  type: integer
 *                              ProjectId:
 *                                  type: integer
 *                              ProjectEmployeeId:
 *                                  type: integer
 *          400:
 *              description: EmployeeId and ProjectId are required
 *          409:
 *              description: Employee is already assigned to this project
 *          500:
 *              description: Error adding Employee to Project
 */
router.post('/InjectEmployeeToProject', (req, res) => {
    const { EmployeeId, ProjectId } = req.body

    if (!EmployeeId || !ProjectId) {
        return sendResponse(res, 400, 'error', 'EmployeeId and ProjectId are required', null);
    }

    const checksql = 'SELECT * FROM `Project_Employees` WHERE `EmployeeId` = ? AND `ProjectId` = ?';
    connection.query(checksql, [EmployeeId, ProjectId], (err, result) => {
        if(err) {
            console.error('Error', err);
            return sendResponse(res, 500, 'error', 'error checking employee', null);
        }
        if(result.length > 0) {
            return sendResponse(res, 400, 'error', 'Employee is already in project', null);
        }

        const sql = 'INSERT INTO `Project_Employees` (`EmployeeId`, `ProjectId`) VALUES (?,?)';
        const values = [EmployeeId, ProjectId];

        connection.query(sql,values, (err, result) => {
            if(err) {
                console.error('Error',err);
                return sendResponse(res, 500, 'error', 'Error add Employee to Project', null);
            }
            sendResponse(res, 201, 'success', 'Employee added to Project successfully', {
                EmployeeId,
                ProjectId,
                ProjectEmployeeId: result.insertId 
            });
        }); 
    });
});

/**
 * @swagger
 * /costdata/CreateNewModule:
 *  post:
 *      tags:
 *      - Master2
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          ModuleName:
 *                              type: string
 *                              example: "New Module"
 *                          ModuleAddDate:
 *                              type: string
 *                              format: date
 *                              example: "2024-10-01"
 *                          ModuleDueDate:
 *                              type: string
 *                              format: date
 *                              example: "2024-10-15"
 *                          ProjectId:
 *                              type: integer
 *                              example: 1
 *                          EmployeeIds:
 *                              type: array
 *                              items:
 *                                  type: integer
 *                                  example: 1
 *      responses:
 *          201:
 *              description: Module created successfully with employees assigned
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              ModuleId:
 *                                  type: integer
 *                              ModuleName:
 *                                  type: string
 *                              ModuleAddDate:
 *                                  type: string
 *                              ModuleDueDate:
 *                                  type: string
 *                              ProjectId:
 *                                  type: integer
 *                              EmployeeIds:
 *                                  type: array
 *                                  items:
 *                                      type: integer
 *          400:
 *              description: Module Name, Add Date, Due Date, Project ID, and at least one Employee ID are required
 *          500:
 *              description: Error creating module or adding employees
 */
router.post('/CreateNewModule', (req, res) => {
    const { ModuleName, ModuleAddDate, ModuleDueDate, ProjectId, EmployeeIds } = req.body; // Use EmployeeIds as an array

    // Validate required fields
    if (!ModuleName || !ModuleAddDate || !ModuleDueDate || !ProjectId || !EmployeeIds || !Array.isArray(EmployeeIds) || EmployeeIds.length === 0) {
        return sendResponse(res, 400, 'error', 'Module Name, Add Date, Due Date, Project ID, and at least one Employee ID are required', null);
    }

    const moduleSql = 'INSERT INTO `Modules` (`ModuleName`, `ModuleAddDate`, `ModuleDueDate`, `ProjectId`) VALUES (?, ?, ?, ?)';
    const moduleValues = [ModuleName, ModuleAddDate, ModuleDueDate, ProjectId];

    connection.query(moduleSql, moduleValues, (err, result) => {
        if (err) {
            console.error('Error creating module:', err);
            return sendResponse(res, 500, 'error', 'Error creating module', null);
        }

        const ModuleId = result.insertId; // Get the newly created ModuleId

        const insertPromises = EmployeeIds.map(EmployeeId => {
            // Check if the employee is associated with the project
            const checkEmployeeInProject = 'SELECT * FROM `Project_Employees` WHERE `EmployeeId` = ? AND `ProjectId` = ?';
            
            return new Promise((resolve, reject) => {
                connection.query(checkEmployeeInProject, [EmployeeId, ProjectId], (err, result) => {
                    if (err) {
                        console.error('Error checking employee in project:', err);
                        return reject(err);
                    }

                    // If the employee is in the project, check if they are already assigned to the module
                    if (result.length > 0) {
                        const checkModuleEmployeeSql = 'SELECT * FROM `Module_Employees` WHERE `EmployeeId` = ? AND `ModuleId` = ?';

                        connection.query(checkModuleEmployeeSql, [EmployeeId, ModuleId], (err, result) => {
                            if (err) {
                                console.error('Error checking employee assignment:', err);
                                return reject(err);
                            }

                            // If the employee is not assigned to this module, insert them
                            if (result.length === 0) {
                                const moduleEmployeeSql = 'INSERT INTO `Module_Employees` (`EmployeeId`, `ModuleId`) VALUES (?, ?)';
                                connection.query(moduleEmployeeSql, [EmployeeId, ModuleId], (err) => {
                                    if (err) {
                                        console.error('Error adding employee to module:', err);
                                        return reject(err);
                                    }
                                    resolve(); // Resolve promise if insertion is successful
                                });
                            } else {
                                resolve(); // Resolve promise if employee is already assigned (skip insertion)
                            }
                        });
                    } else {
                        console.warn(`Employee ID ${EmployeeId} is not in Project ID ${ProjectId}. Skipping...`);
                        resolve(); // Resolve promise if employee is not in the project (skip insertion)
                    }
                });
            });
        });

        // Step 3: Wait for all employee insertions to complete
        Promise.all(insertPromises)
            .then(() => {
                sendResponse(res, 201, 'success', 'Module created successfully with employees assigned', {
                    ModuleId,
                    ModuleName,
                    ModuleAddDate,
                    ModuleDueDate,
                    ProjectId,
                    EmployeeIds
                });
            })
            .catch(err => {
                console.error('Error adding employees to module:', err);
                sendResponse(res, 500, 'error', 'Error adding employees to module', null);
            });
    });
});

/**
 * @swagger
 * /costdata/CreateNewEvent:
 *  post:
 *      tags:
 *      - Master2
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          EventTitle:
 *                              type: string
 *                              example: "New Event"
 *                          EventDescription:
 *                              type: string
 *                              example: "New Event Description"
 *                          EventStart:
 *                              type: string
 *                              format: date
 *                              example: "2024-10-01"
 *                          EventEnd:
 *                              type: string
 *                              format: date
 *                              example: "2024-10-15"
 *                          ProjectId:
 *                              type: integer
 *                              example: 1
 *                          EmployeeIds:
 *                              type: array
 *                              items:
 *                                  type: integer
 *                                  example: 1
 *          responses:
 *              201:
 *                  description: Event created successfully with employees assigned
 *                  content:
 *                      application/json:
 *                          type: object
 *                          properties:
 *                              EventId:
 *                                  type: integer
 *                              EventTitle:
 *                                  type: string
 *                              EventDescription:
 *                                  type: string
 *                              ProjectId:
 *                                  type: integer
 *                              EmployeeIds:
 *                                  type: array
 *                                  items:
 *                                      type: integer
 *              400:
 *                  description: Event item is required
 *              500:
 *                  description: Error creating event or adding employees
 */
router.post('/CreateNewEvent', (req, res) => {
    const { EventTitle, EventDescription, EventStart, EventEnd, ProjectId , EmployeeIds} = req.body

    if(!EventTitle || !EventStart || !EventEnd || !ProjectId || !EmployeeIds || !Array.isArray(EmployeeIds) || EmployeeIds.length === 0) {
        return sendResponse(res, 400, 'error', 'event is required', null);
    }

    const sqlInsert = 'INSERT INTO `Events` (`EventTitle`, `EventDescription`, `EventStart`, `EventEnd`, `ProjectId`) VALUES (?, ?, ?, ?, ?)';
    const eventitem = [EventTitle, EventDescription, EventStart, EventEnd, ProjectId];

    connection.query(sqlInsert,eventitem, (err, result) => {
        if(err) {
            console.error('Error', err);
            return sendResponse(res, 500, 'error', 'Error add new events', null);
        }
        
        const EventId = result.insertId

        const insertPromises = EmployeeIds.map(EmployeeId => {
            const checkEmployeeInProject = 'SELECT * FROM `Project_Employees` WHERE `EmployeeId` = ? AND `ProjectId` = ?';

            return new Promise((reslove, reject) => {
                connection.query(checkEmployeeInProject, [EmployeeId, ProjectId], (err, result) => {
                    if(err) {
                        console.error('Error checking employee in project:', err);
                        return reject(err);
                    }

                    if(result.length > 0) {
                        const checkEventEmployeesql = 'SELECT * FROM `Event_Employees` WHERE `EmployeeId` = ? AND `EventId` = ? ';

                        connection.query(checkEventEmployeesql, [EmployeeId, EventId], (err, result) => {
                            if(err) {
                                console.error('Error check employee events : ', err);
                                return reject(err);
                            }

                            if(result.length === 0) {
                                const eventsEmployeesql = 'INSERT INTO `Event_Employees` (`EmployeeId`, `EventId`) VALUES (?, ?)';
                                connection.query(eventsEmployeesql, [EmployeeId, EventId], (err) => {
                                    if(err) {
                                        console.error('Error Add ing Employee to Event', err);
                                        return reject(err);
                                    }
                                    reslove();                                    
                                });
                            } else {
                                reslove();
                            }
                        });
                    } else {
                        console.warn(`EmployeeId ${EmployeeId} is not in project `);
                        reslove();
                    }
                });
            });
        });

        Promise.all(insertPromises).then(() => {
            sendResponse(res, 201, 'success', 'Created Event successfully',
                EventId,
                EventTitle,
                EventStart,
                EventEnd,
                ProjectId,
                EmployeeIds
            );
        }).catch(err => {
            console.error('Error adding employees to event', err);
            sendResponse(res, 500, 'error', 'Error adding employee to event', null);
        });
    });
});


module.exports = router;