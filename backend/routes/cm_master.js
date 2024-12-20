const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const { sendResponse } = require('../responseHelper');
const { param } = require('express-validator');
const moment = require('moment');

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
 * tags:
 *  - name: Event2
 */

/**
 * @swagger
 * paths:
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
    const { EmployeeName, RoleId, EmployeePosition, EmployeeCost } = req.body;

    // Check for required fields
    if (!EmployeeName || EmployeeCost == null) {
        return sendResponse(res, 400, 'error', 'Missing required fields', null);
    }

    let finalRoleId = RoleId; // This will store the final RoleId to insert into the Employees table

    // If RoleId is not provided, fetch it based on EmployeePosition
    if (!RoleId && EmployeePosition) {
        const positionQuery = 'SELECT GeneralId FROM General WHERE GeneralName = ?';
        connection.query(positionQuery, [EmployeePosition], (err, results) => {
            if (err) {
                console.error('Error fetching GeneralId for EmployeePosition:', err);
                return sendResponse(res, 500, 'error', 'Error fetching GeneralId', null);
            }

            // Check if a matching GeneralId was found
            if (results.length > 0) {
                finalRoleId = results[0].GeneralId; // Assign GeneralId to finalRoleId
            } else {
                return sendResponse(res, 400, 'error', 'Invalid EmployeePosition provided', null);
            }

            // Proceed to insert the new employee
            insertNewEmployee();
        });
    } else {
        // If RoleId is provided, proceed to insert the new employee
        insertNewEmployee();
    }

    // Function to insert a new employee into the database
    function insertNewEmployee() {
        const sql = 'INSERT INTO `Employees` (`EmployeeName`, `RoleId`, `EmployeeCost`) VALUES (?, ?, ?)';
        const values = [EmployeeName, finalRoleId, EmployeeCost];

        connection.query(sql, values, (err, result) => {
            if (err) {
                console.error('Error creating new employee:', err);
                return sendResponse(res, 500, 'error', 'Error creating new employee', null);
            }

            sendResponse(res, 200, 'success', 'Created new employee successfully', {
                EmployeeId: result.insertId,
                EmployeeName,
                RoleId: finalRoleId,
                EmployeeCost
            });
        });
    }
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
 *                          EmployeeName:
 *                              type: string
 *                              example: "Main"
 *                          ProjectName:
 *                              type: string
 *                              example: "New Project"
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
    const { EmployeeName, ProjectName } = req.body;

    if (!EmployeeName || !ProjectName) {
        return sendResponse(res, 400, 'error', 'EmployeeName and ProjectName are required', null);
    }

    // Fetch Project by ProjectName
    const fetchProj = 'SELECT ProjectId, ProjectName FROM Projects WHERE ProjectName = ?';
    connection.query(fetchProj, [ProjectName], (err, pro) => {
        if (err) {
            console.error('Error fetching project', err);
            return sendResponse(res, 500, 'error', 'Database error fetching project', null);
        }

        if (pro.length === 0) {
            return sendResponse(res, 404, 'error', 'Project not found', null);
        }

        const ProjectId = pro[0].ProjectId;

        // Fetch Employee by EmployeeName
        const fetchEm = 'SELECT EmployeeId, EmployeeName FROM Employees WHERE EmployeeName = ?';
        connection.query(fetchEm, [EmployeeName], (err, em) => {
            if (err) {
                console.error('Error fetching employee', err);
                return sendResponse(res, 500, 'error', 'Database error fetching employee', null);
            }

            if (em.length === 0) {
                return sendResponse(res, 404, 'error', 'Employee not found', null);
            }

            const EmployeeId = em[0].EmployeeId;

            // Check if Employee is already in the project
            const checksql = 'SELECT * FROM `Project_Employees` WHERE `EmployeeId` = ? AND `ProjectId` = ?';
            connection.query(checksql, [EmployeeId, ProjectId], (err, result) => {
                if (err) {
                    console.error('Error checking employee in project', err);
                    return sendResponse(res, 500, 'error', 'Error checking employee in project', null);
                }

                if (result.length > 0) {
                    return sendResponse(res, 400, 'error', 'Employee is already in the project', null);
                }

                // Add Employee to the project
                const sql = 'INSERT INTO `Project_Employees` (`EmployeeId`, `ProjectId`) VALUES (?,?)';
                const values = [EmployeeId, ProjectId];

                connection.query(sql, values, (err, result) => {
                    if (err) {
                        console.error('Error adding employee to project', err);
                        return sendResponse(res, 500, 'error', 'Error adding employee to project', null);
                    }

                    // Return success response
                    sendResponse(res, 201, 'success', 'Employee added to Project successfully', {
                        EmployeeId,
                        ProjectId,
                        ProjectEmployeeId: result.insertId
                    });
                });
            });
        });
    });
});


/**
 * @swagger
 * /costdata/CreateNewModule:
 *  post:
 *      tags:
 *      - Module2
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
 *                              totalModuleCost:
 *                                  type: number
 *          400:
 *              description: Module Name, Add Date, Due Date, Project ID, and at least one Employee ID are required
 *          500:
 *              description: Error creating module or adding employees
 */
router.post('/CreateNewModule', (req, res) => {
    const { ModuleName, ModuleAddDate, ModuleDueDate, ProjectId, EmployeeIds } = req.body;
    // Validate required fields
    if (!ModuleName || !ModuleAddDate || !ModuleDueDate || !ProjectId || !EmployeeIds || !Array.isArray(EmployeeIds) || EmployeeIds.length === 0) {
        return sendResponse(res, 400, 'error', 'Module Name, Add Date, Due Date, Project ID, and at least one Employee ID are required', null);
    }

    // Check for duplicate module name
    const checkDuplicateModuleSql = 'SELECT * FROM `Modules` WHERE `ModuleName` = ? AND `ProjectId` = ?';
    connection.query(checkDuplicateModuleSql, [ModuleName, ProjectId], (err, result) => {
        if (err) {
            console.error('Error checking duplicate module name:', err);
            return sendResponse(res, 500, 'error', 'Error checking duplicate module name', null);
        }

        if (result.length > 0) {
            return sendResponse(res, 400, 'error', `Module with the name "${ModuleName}" already exists in Project ID ${ProjectId}`, null);
        }

        // Start transaction
        connection.beginTransaction((err) => {
            if (err) {
                console.error('Error starting transaction:', err);
                return sendResponse(res, 500, 'error', 'Error starting transaction', null);
            }

            // Insert the module
            const moduleSql = 'INSERT INTO `Modules` (`ModuleName`, `ModuleAddDate`, `ModuleDueDate`, `ProjectId`) VALUES (?, ?, ?, ?)';
            const moduleValues = [ModuleName, ModuleAddDate, ModuleDueDate, ProjectId];

            connection.query(moduleSql, moduleValues, (err, result) => {
                if (err) {
                    console.error('Error creating module:', err);
                    return connection.rollback(() => {
                        sendResponse(res, 500, 'error', 'Error creating module', null);
                    });
                }

                const ModuleId = result.insertId; // Get the newly created ModuleId

                // Assign employees to module
                const insertPromises = EmployeeIds.map(EmployeeId => {
                    const checkEmployeeInProject = 'SELECT * FROM `Project_Employees` WHERE `EmployeeId` = ? AND `ProjectId` = ?';

                    return new Promise((resolve, reject) => {
                        connection.query(checkEmployeeInProject, [EmployeeId, ProjectId], (err, result) => {
                            if (err) {
                                console.error('Error checking employee in project:', err);
                                return reject(err);
                            }

                            if (result.length > 0) {
                                const checkModuleEmployeeSql = 'SELECT * FROM `Module_Employees` WHERE `EmployeeId` = ? AND `ModuleId` = ?';

                                connection.query(checkModuleEmployeeSql, [EmployeeId, ModuleId], (err, result) => {
                                    if (err) {
                                        console.error('Error checking employee assignment:', err);
                                        return reject(err);
                                    }

                                    if (result.length === 0) {
                                        const moduleEmployeeSql = 'INSERT INTO `Module_Employees` (`EmployeeId`, `ModuleId`, `addDate`, `dueDate`) VALUES (?, ?, ?, ?)';
                                        connection.query(moduleEmployeeSql, [EmployeeId, ModuleId, ModuleAddDate, ModuleDueDate], (err) => {
                                            if (err) {
                                                console.error('Error adding employee to module:', err);
                                                return reject(err);
                                            }
                                            resolve();
                                        });
                                    } else {
                                        resolve();
                                    }
                                });
                            } else {
                                console.warn(`Employee ID ${EmployeeId} is not in Project ID ${ProjectId}. Skipping...`);
                                resolve();
                            }
                        });
                    });
                });

                // Wait for all employee assignments to complete
                Promise.all(insertPromises)
                    .then(() => {
                        // Calculate employee costs
                        const daysInModule = (new Date(ModuleDueDate) - new Date(ModuleAddDate)) / (1000 * 60 * 60 * 24); // Number of days in the module
                        const employeeCostsSql = 'SELECT SUM(employeeCost) AS totalEmployeeCost FROM `Employees` WHERE `EmployeeId` IN (?)';

                        connection.query(employeeCostsSql, [EmployeeIds], (err, result) => {
                            if (err) {
                                console.error('Error calculating employee costs:', err);
                                return connection.rollback(() => {
                                    sendResponse(res, 500, 'error', 'Error calculating employee costs', null);
                                });
                            }

                            const totalEmployeeCost = result[0].totalEmployeeCost || 0; // Handle case where cost is null
                            const totalModuleCost = daysInModule * totalEmployeeCost;

                            // Update project cost
                            const updateProjectCostSql = 'UPDATE `Projects` SET `projectCost` = `projectCost` + ? WHERE `ProjectId` = ?';
                            connection.query(updateProjectCostSql, [totalModuleCost, ProjectId], (err) => {
                                if (err) {
                                    console.error('Error updating project cost:', err);
                                    return connection.rollback(() => {
                                        sendResponse(res, 500, 'error', 'Error updating project cost', null);
                                    });
                                }

                                // Commit transaction
                                connection.commit((err) => {
                                    if (err) {
                                        console.error('Error committing transaction:', err);
                                        return connection.rollback(() => {
                                            sendResponse(res, 500, 'error', 'Error committing transaction', null);
                                        });
                                    }

                                    sendResponse(res, 201, 'success', 'Module created successfully with employees assigned and project cost updated', {
                                        ModuleId,
                                        ModuleName,
                                        ModuleAddDate,
                                        ModuleDueDate,
                                        ProjectId,
                                        EmployeeIds,
                                        totalModuleCost
                                    });
                                });
                            });
                        });
                    })
                    .catch(err => {
                        console.error('Error adding employees to module:', err);
                        return connection.rollback(() => {
                            sendResponse(res, 500, 'error', 'Error adding employees to module', null);
                        });
                    });
            });
        });
    });
});


/**
 * @swagger
 * /costdata/UpdateModuleEmployees:
 *  patch:
 *      tags:
 *      - Module2
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      required:
 *                          - ModuleId
 *                          - EmployeeIds
 *                      properties:
 *                          ModuleId:
 *                              type: integer
 *                          EmployeeIds:
 *                              type: array
 *                              items:
 *                                  type: integer
 *      responses:
 *          200:
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              totalModuleCost:
 *                                  type: number
 *                              addedEmployees:
 *                                  type: array
 *                                  items:
 *                                      type: integer
 *          400:
 *              description: At least one Employee ID is required, or there are other validation errors (e.g., module start date validation failure)
 *          404:
 *              description: Module not found
 *          500:
 *              description: Error updating module, adding employees, or calculating the project cost
 */
router.patch('/UpdateModuleEmployees', (req, res) => {
    const { ModuleId, EmployeeIds } = req.body;

    // Validate required fields
    if (!EmployeeIds || !Array.isArray(EmployeeIds) || EmployeeIds.length === 0) {
        return sendResponse(res, 400, 'error', 'At least one Employee ID is required', null);
    }

    // Retrieve module details
    const moduleSql = 'SELECT ModuleAddDate, ModuleDueDate, ProjectId FROM `Modules` WHERE `ModuleId` = ?';
    connection.query(moduleSql, [ModuleId], (err, moduleResult) => {
        if (err) {
            console.error('Error retrieving module:', err);
            return sendResponse(res, 500, 'error', 'Error retrieving module', null);
        }

        if (moduleResult.length === 0) {
            return sendResponse(res, 404, 'error', 'Module not found', null);
        }

        const { ModuleAddDate, ModuleDueDate, ProjectId } = moduleResult[0];
        const today = new Date();

        let daysInModule = (new Date(ModuleDueDate) - today) / (1000 * 60 * 60 * 24); // Days from today until ModuleDueDate

        if (daysInModule < 0) {
            return sendResponse(res, 400, 'error', 'Module has already ended. Cannot add employees.', null);
        }

        // Format dates as 'YYYY-MM-DD HH:MM:SS'
        const formattedToday = today.toISOString().slice(0, 19).replace('T', ' ');
        const formattedModuleDueDate = new Date(ModuleDueDate).toISOString().slice(0, 19).replace('T', ' ');

        // Add new employees to the module
        const insertPromises = EmployeeIds.map(EmployeeId => {
            return new Promise((resolve, reject) => {
                const checkModuleEmployeeSql = 'SELECT * FROM `Module_Employees` WHERE `EmployeeId` = ? AND `ModuleId` = ?';
                connection.query(checkModuleEmployeeSql, [EmployeeId, ModuleId], (err, result) => {
                    if (err) {
                        console.error('Error checking employee assignment:', err);
                        return reject(err);
                    }

                    if (result.length === 0) {
                        // Employee is new, insert with AddDate and DueDate
                        const moduleEmployeeSql = 'INSERT INTO `Module_Employees` (`EmployeeId`, `ModuleId`, `AddDate`, `DueDate`) VALUES (?, ?, ?, ?)';
                        connection.query(moduleEmployeeSql, [EmployeeId, ModuleId, formattedToday, formattedModuleDueDate], (err) => {
                            if (err) {
                                console.error('Error adding employee to module:', err);
                                return reject(err);
                            }
                            resolve();
                        });
                    } else {
                        // Employee already exists, do nothing
                        resolve();
                    }
                });
            });
        });

        Promise.all(insertPromises)
            .then(() => {
                // Calculate costs for the newly added employees
                const employeeCostsSql = 'SELECT SUM(EmployeeCost) AS totalEmployeeCost FROM `Employees` WHERE `EmployeeId` IN (?)';
                connection.query(employeeCostsSql, [EmployeeIds], (err, result) => {
                    if (err) {
                        console.error('Error calculating employee costs:', err);
                        return sendResponse(res, 500, 'error', 'Error calculating employee costs', null);
                    }

                    const totalEmployeeCost = result[0].totalEmployeeCost || 0; // Handle case where cost is null
                    const totalModuleCost = (daysInModule * totalEmployeeCost).toFixed(2);

                    // Update project cost
                    const updateProjectCostSql = 'UPDATE `Projects` SET `projectCost` = `projectCost` + ? WHERE `ProjectId` = ?';
                    connection.query(updateProjectCostSql, [totalModuleCost, ProjectId], (err) => {
                        if (err) {
                            console.error('Error updating project cost:', err);
                            return sendResponse(res, 500, 'error', 'Error updating project cost', null);
                        }

                        sendResponse(res, 200, 'success', 'Employees added successfully and project cost updated', {
                            totalModuleCost,
                            addedEmployees: EmployeeIds
                        });
                    });
                });
            })
            .catch(err => {
                console.error('Error adding employees to module:', err);
                sendResponse(res, 500, 'error', 'Error adding employees to module', null);
            });
    });
});

router.post('/GetEventInProject', (req, res) => {
    const { ProjectName, ProjectId } = req.body;

    // Validate input
    if (!ProjectId && !ProjectName) {
        return res.status(400).json({ status: 'error', message: 'ProjectId or ProjectName must be provided', data: null });
    }

    const checkProject = `
        SELECT ProjectId, ProjectName
        FROM Projects 
        WHERE (ProjectId = ? OR ProjectName = ?)
    `;

    connection.query(checkProject, [ProjectId, ProjectName], (err, projects) => {
        if (err) {
            console.error('Error fetching project:', err);
            return res.status(500).json({ status: 'error', message: 'Database query error', data: null });
        }

        if (projects.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Project not found', data: null });
        }

        // Assuming only one project is returned, get the ProjectId
        const projectId = projects[0].ProjectId;

        // Fetch events related to the project
        const getEvents = `
            SELECT EventId, EventTitle, EventDescription, EventStart, EventEnd 
            FROM events 
            WHERE ProjectId = ?
        `;

        connection.query(getEvents, [projectId], (err, events) => {
            if (err) {
                console.error('Error fetching events:', err);
                return res.status(500).json({ status: 'error', message: 'Database query error', data: null });
            }

            // Prepare to return employee data for each event
            const eventPromises = events.map(event => {
                return new Promise((resolve) => {
                    const getEmployees = `
                        SELECT e.EmployeeId, e.EmployeeName, 
                               CAST(e.EmployeeCost AS SIGNED) AS EmployeeCost, 
                               g.GeneralName AS EmployeePosition
                        FROM Employees e
                        LEFT JOIN General g ON g.GeneralId = e.RoleId
                        WHERE e.EmployeeId IN (
                            SELECT EmployeeId FROM event_employees WHERE EventId = ?
                        )
                    `;
                    connection.query(getEmployees, [event.EventId], (err, employees) => {
                        if (err) {
                            console.error('Error fetching employees:', err);
                            resolve({ EventId: event.EventId, Employees: [], ...event }); // Resolve with an empty array on error
                        } else {
                            resolve({ EventId: event.EventId, Employees: employees, ...event });
                        }
                    });
                });
            });

            // Wait for all employee data to be fetched
            Promise.all(eventPromises).then(eventData => {
                // Prepare final data structure
                const responseData = eventData.map(({ EventId, EventTitle, EventDescription, EventStart, EventEnd, Employees }) => ({
                    EventId,
                    EventTitle,
                    EventDescription,
                    EventStart,
                    EventEnd,
                    Employees
                }));

                res.status(200).json({ status: 'success', message: 'Data retrieved successfully', data: responseData });
            }).catch(err => {
                console.error('Error fetching employee data:', err);
                res.status(500).json({ status: 'error', message: 'Error retrieving employee data', data: null });
            });
        });
    });
});

router.post('/GetEventPerEmployee', (req, res) => {
    const { ProjectName, ProjectId } = req.body;

    // Validate input
    if (!ProjectId && !ProjectName) {
        return res.status(400).json({ status: 'error', message: 'ProjectId or ProjectName must be provided', data: null });
    }

    const checkProject = `
        SELECT ProjectId, ProjectName
        FROM Projects 
        WHERE (ProjectId = ? OR ProjectName = ?)
    `;

    connection.query(checkProject, [ProjectId, ProjectName], (err, projects) => {
        if (err) {
            console.error('Error fetching project:', err);
            return res.status(500).json({ status: 'error', message: 'Database query error', data: null });
        }

        if (projects.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Project not found', data: null });
        }

        // Assuming only one project is returned, get the ProjectId
        const projectId = projects[0].ProjectId;

        // Fetch all employees related to the project
        const getEmployees = `
            SELECT e.EmployeeId, e.EmployeeName, 
                   CAST(e.EmployeeCost AS SIGNED) AS EmployeeCost, 
                   g.GeneralName AS EmployeePosition
            FROM Employees e
            LEFT JOIN General g ON g.GeneralId = e.RoleId
            WHERE e.EmployeeId IN (
                SELECT DISTINCT EmployeeId FROM event_employees ee
                INNER JOIN events ev ON ee.EventId = ev.EventId
                WHERE ev.ProjectId = ?
            )
        `;

        connection.query(getEmployees, [projectId], (err, employees) => {
            if (err) {
                console.error('Error fetching employees:', err);
                return res.status(500).json({ status: 'error', message: 'Database query error', data: null });
            }

            if (employees.length === 0) {
                return res.status(404).json({ status: 'error', message: 'No employees found for the project', data: null });
            }

            // Prepare to fetch events for each employee
            const employeePromises = employees.map(employee => {
                return new Promise((resolve) => {
                    const getEvents = `
                        SELECT ev.EventId, ev.EventTitle, ev.EventDescription, ev.EventStart, ev.EventEnd
                        FROM events ev
                        INNER JOIN event_employees ee ON ev.EventId = ee.EventId
                        WHERE ee.EmployeeId = ?
                    `;
                    connection.query(getEvents, [employee.EmployeeId], (err, events) => {
                        if (err) {
                            console.error('Error fetching events:', err);
                            resolve({
                                EmployeeId: employee.EmployeeId,
                                EmployeeData: {
                                    EmployeeName: employee.EmployeeName,
                                    EmployeeCost: employee.EmployeeCost,
                                    EmployeePosition: employee.EmployeePosition,
                                    Events: [] // Empty array on error
                                }
                            });
                        } else {
                            resolve({
                                EmployeeId: employee.EmployeeId,
                                EmployeeData: {
                                    EmployeeName: employee.EmployeeName,
                                    EmployeeCost: employee.EmployeeCost,
                                    EmployeePosition: employee.EmployeePosition,
                                    Events: events.map(event => ({
                                        EventId: event.EventId,
                                        EventTitle: event.EventTitle,
                                        EventDescription: event.EventDescription,
                                        EventStart: event.EventStart,
                                        EventEnd: event.EventEnd
                                    }))
                                }
                            });
                        }
                    });
                });
            });

            // Wait for all employee-event data to be fetched
            Promise.all(employeePromises).then(employeeData => {
                res.status(200).json({ status: 'success', message: 'Data retrieved successfully', data: employeeData });
            }).catch(err => {
                console.error('Error fetching employee-event data:', err);
                res.status(500).json({ status: 'error', message: 'Error retrieving employee-event data', data: null });
            });
        });
    });
});



/**
 * @swagger
 * /costdata/CreateNewEvent:
 *  post:
 *      tags:
 *      - Event2
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
    const { EventTitle, EventDescription, EventStart, EventEnd, ProjectId, ProjectName, EmployeeIds } = req.body;

    // Validate input
    if (!EventTitle || !EventStart || !EventEnd || (!ProjectId && !ProjectName) || !EmployeeIds || !Array.isArray(EmployeeIds) || EmployeeIds.length === 0) {
        return sendResponse(res, 400, 'error', 'event is required', null);
    }

    // Check for duplicate EmployeeIds
    const uniqueEmployeeIds = new Set(EmployeeIds);
    if (uniqueEmployeeIds.size !== EmployeeIds.length) {
        return sendResponse(res, 400, 'error', 'Duplicate EmployeeIds are not allowed', null);
    }

    // Step 1: Find ProjectId if only ProjectName is provided
    let projectIdToUse = ProjectId;

    if (!ProjectId && ProjectName) {
        const findProjectId = `
            SELECT ProjectId FROM Projects 
            WHERE ProjectName = ?
        `;
        connection.query(findProjectId, [ProjectName], (err, projectResults) => {
            if (err) {
                console.error('Error finding project by name:', err);
                return sendResponse(res, 500, 'error', 'Database query error', null);
            }

            if (projectResults.length === 0) {
                return sendResponse(res, 404, 'error', 'Project not found', null);
            }

            projectIdToUse = projectResults[0].ProjectId;

            // Now that we have the ProjectId, we can continue with event creation
            createEvent();
        });
    } else {
        // If ProjectId is provided, we can directly create the event
        createEvent();
    }

    function createEvent() {
        const sqlInsert = 'INSERT INTO `Events` (`EventTitle`, `EventDescription`, `EventStart`, `EventEnd`, `ProjectId`) VALUES (?, ?, ?, ?, ?)';
        const eventItem = [EventTitle, EventDescription, EventStart, EventEnd, projectIdToUse];

        connection.query(sqlInsert, eventItem, (err, result) => {
            if (err) {
                console.error('Error', err);
                return sendResponse(res, 500, 'error', 'Error adding new event', null);
            }

            const EventId = result.insertId;

            const insertPromises = EmployeeIds.map(EmployeeId => {
                const checkEmployeeInProject = 'SELECT * FROM `Project_Employees` WHERE `EmployeeId` = ? AND `ProjectId` = ?';

                return new Promise((resolve, reject) => {
                    connection.query(checkEmployeeInProject, [EmployeeId, projectIdToUse], (err, result) => {
                        if (err) {
                            console.error('Error checking employee in project:', err);
                            return reject(err);
                        }

                        if (result.length > 0) {
                            const checkEventEmployeeSql = 'SELECT * FROM `Event_Employees` WHERE `EmployeeId` = ? AND `EventId` = ?';

                            connection.query(checkEventEmployeeSql, [EmployeeId, EventId], (err, result) => {
                                if (err) {
                                    console.error('Error checking employee events:', err);
                                    return reject(err);
                                }

                                if (result.length === 0) {
                                    // Only add employee if they are not already assigned to this event
                                    const eventEmployeeSql = 'INSERT INTO `Event_Employees` (`EmployeeId`, `EventId`) VALUES (?, ?)';
                                    connection.query(eventEmployeeSql, [EmployeeId, EventId], (err) => {
                                        if (err) {
                                            console.error('Error adding employee to event:', err);
                                            return reject(err);
                                        }
                                        resolve();
                                    });
                                } else {
                                    console.warn(`EmployeeId ${EmployeeId} is already assigned to EventId ${EventId}`);
                                    resolve(); // Employee is already assigned, resolve the promise
                                }
                            });
                        } else {
                            console.warn(`EmployeeId ${EmployeeId} is not in project`);
                            resolve(); // Employee is not part of the project, still resolve
                        }
                    });
                });
            });

            Promise.all(insertPromises).then(() => {
                sendResponse(res, 201, 'success', 'Created event successfully',
                    EventId,
                    EventTitle,
                    EventStart,
                    EventEnd,
                    projectIdToUse,
                    EmployeeIds
                );
            }).catch(err => {
                console.error('Error adding employees to event:', err);
                sendResponse(res, 500, 'error', 'Error adding employees to event', null);
            });
        });
    }
});


/**
 * @swagger
 * /costdata/GetMasterData:
 *   get:
 *     tags:
 *       - Master2  # Correctly formatted tag
 *     responses:
 *       200:
 *         description: Successfully fetched master data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   ProjectId:
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
 *                   Modules:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         ModuleId:
 *                           type: integer
 *                         ModuleName:
 *                           type: string
 *                         ModuleAddDate:
 *                           type: string
 *                           format: date
 *                         ModuleDueDate:
 *                           type: string
 *                           format: date
 *                         Employees:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               EmployeeId:
 *                                 type: integer
 *                               EmployeeName:
 *                                 type: string
 *                               EmployeePosition:
 *                                 type: string
 *                               EmployeeCost:
 *                                 type: integer
 *                                 format: float
 *       500:
 *         description: An error occurred while fetching master data
 */
router.get('/GetMasterData', (req, res) => {
    const projectsql = 'SELECT ProjectId, ProjectName, ProjectStart, ProjectEnd, ProjectStatus FROM Projects';

    connection.query(projectsql, (err, projects) => {
        if (err) {
            console.error('Error:', err);
            return sendResponse(res, 500, 'error', 'Error fetching projects', null);
        }

        if (projects.length === 0) {
            return sendResponse(res, 200, 'success', 'No project found');
        }

        const moduleQueries = projects.map(project => {
            return new Promise((resolve, reject) => {
                const modulesql = 'SELECT * FROM Modules WHERE ProjectId = ?';
                connection.query(modulesql, [project.ProjectId], (err, modules) => {
                    if (err) {
                        console.error('Error fetching modules', err);
                        return reject();
                    }

                    project.Modules = modules;
                    if (modules.length === 0) {
                        return resolve(project);
                    }

                    const employeequeries = modules.map(module => {
                        return new Promise((resolve, reject) => {
                            const employeesql = `
                                SELECT e.*, g.GeneralName AS EmployeePosition
                                FROM Employees e
                                JOIN module_employees me ON e.EmployeeId = me.EmployeeId
                                JOIN General g ON e.RoleId = g.GeneralId
                                WHERE me.ModuleId = ?
                            `;
                            connection.query(employeesql, [module.ModuleId], (err, employees) => {
                                if (err) {
                                    console.error('Error fetching employees for module:', err);
                                    return reject(err);
                                }

                                module.Employees = employees;
                                resolve(module);
                            });
                        });
                    });

                    Promise.all(employeequeries)
                        .then(() => resolve(project))
                        .catch(reject);
                });
            });
        });

        Promise.all(moduleQueries)
            .then(() => {
                sendResponse(res, 200, 'success', 'Master data fetched successfully', projects);
            })
            .catch(err => {
                console.error('Error fetching Master data', err);
                sendResponse(res, 500, 'error', 'Error fetching master data', null);
            });
    });
});


/**
 * @swagger
 * /costdata/GetChartData:
 *   get:
 *     tags:
 *       - Master2
 *     summary: Get the oldest project start date and associated project details by month.
 *     responses:
 *       200:
 *         description: Successfully retrieved the oldest date and project details.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   year:
 *                     type: integer
 *                   chart:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         month:
 *                           type: string
 *                         detail:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               ProjectName:
 *                                 type: string
 *                               Cost:
 *                                 type: number
 *                         total:
 *                           type: number
 *       500:
 *         description: Database query error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       404:
 *         description: No data found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get('/GetChartData', async (req, res) => {
    const dateSql = 'SELECT MIN(`ProjectStart`) AS OldestDate, MAX(`ProjectEnd`) AS LatestDate FROM `Projects`';

    connection.query(dateSql, async (err, result) => {
        if (err) {
            console.error('Error:', err);
            return sendResponse(res, 500, 'error', 'Database query error', null);
        }

        // Check if a result was returned
        if (result && result.length > 0) {
            const StartDate = new Date(result[0].OldestDate);
            const StartYear = StartDate.getFullYear();
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth();
            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            const months = {};

            for (let year = StartYear; year <= currentYear; year++) {
                months[year] = monthNames.map((monthName, index) => ({
                    month: monthName,
                    detail: [],
                    total: 0,
                }));

                if (year === currentYear) {
                    months[year] = months[year].slice(0, currentMonth + 1); // Cut off future months in the current year
                }
            }

            // Fetch all projects
            const projectsSql = 'SELECT `ProjectId`, `ProjectName`, `ProjectStart`, `ProjectEnd` FROM `Projects`';
            connection.query(projectsSql, async (err, projects) => {
                if (err) {
                    console.error('Error fetching projects:', err);
                    return sendResponse(res, 500, 'error', 'Error fetching project details', null);
                }

                // Process each project
                for (const project of projects) {
                    const projectStart = new Date(project.ProjectStart);
                    const projectEnd = new Date(project.ProjectEnd);
                    const projectStartYear = projectStart.getFullYear();
                    const projectEndYear = projectEnd.getFullYear();

                    // Calculate the active months for the project
                    for (let year = projectStartYear; year <= projectEndYear; year++) {
                        const startMonth = (year === projectStartYear) ? projectStart.getMonth() : 0;
                        const endMonth = (year === projectEndYear) ? Math.min(projectEnd.getMonth(), currentMonth) : 11;

                        for (let month = startMonth; month <= endMonth; month++) {
                            const monthData = months[year][month];
                            const existingDetail = monthData.detail.find(detail => detail.ProjectName === project.ProjectName);

                            if (!existingDetail) {
                                const moduleCost = await calculateModuleCost(project.ProjectId);
                                const formattedModuleCost = parseFloat(moduleCost); // Ensure the cost is a number

                                monthData.detail.push({
                                    ProjectName: project.ProjectName,
                                    Cost: formattedModuleCost, // Format to 00.00
                                });

                                // Update the total cost for the month
                                monthData.total = Math.floor(parseFloat(monthData.total) + formattedModuleCost);
                            }
                        }
                    }
                }

                // Prepare the final chart array
                const chartData = Object.keys(months).map(year => ({
                    year: +year,
                    chart: months[year],
                }));

                sendResponse(res, 200, 'success', 'Oldest date retrieved', chartData);
            });
        } else {
            sendResponse(res, 404, 'error', 'No data found', null);
        }
    });
});


async function calculateModuleCost(projectId) {
    return new Promise((resolve, reject) => {
        const moduleSql = 'SELECT `ModuleId`, `ModuleAddDate`, `ModuleDueDate` FROM `Modules` WHERE ProjectId = ?';
        connection.query(moduleSql, [projectId], async (err, modules) => {
            if (err) {
                console.error('Error fetching modules:', err);
                return reject(err);
            }

            let totalModuleCost = 0; // Initialize total cost

            // Process each module
            for (const module of modules) {
                const moduleCost = await calculateModuleEmployeeCost(module);
                totalModuleCost += parseInt(moduleCost, 10); // Ensure moduleCost is treated as an integer
            }

            resolve(totalModuleCost); // Return as an integer
        });
    });
}

async function calculateModuleEmployeeCost(module) {
    const { ModuleId, ModuleAddDate, ModuleDueDate } = module;

    return new Promise((resolve, reject) => {
        const employeeSql = 'SELECT `EmployeeId`, `AddDate`, `DueDate` FROM `Module_Employees` WHERE ModuleId = ?';
        connection.query(employeeSql, [ModuleId], async (err, employees) => {
            if (err) {
                console.error('Error fetching employees:', err);
                return reject(err);
            }

            let totalEmployeeCost = 0; // Initialize total employee cost

            // Process each employee
            const employeePromises = employees.map(async (employee) => {
                const { EmployeeId, AddDate, DueDate } = employee;
                const addDate = AddDate || ModuleAddDate;
                let dueDate = DueDate || ModuleDueDate;

                const currentDate = new Date();
                dueDate = (new Date(dueDate) > currentDate) ? currentDate : new Date(dueDate);

                // Calculate mandays
                const mandays = calculateMandays(new Date(addDate), new Date(dueDate));

                // Get employee cost
                const employeeCost = await getEmployeeCost(EmployeeId);

                // Calculate module cost for this employee
                return Math.floor(mandays * employeeCost); // Return cost as integer
            });

            try {
                const costs = await Promise.all(employeePromises);
                totalEmployeeCost = costs.reduce((sum, cost) => sum + cost, 0); // Ensure costs are integers
                resolve(totalEmployeeCost); // Return as integer
            } catch (error) {
                console.error('Error calculating employee costs:', error);
                reject(error);
            }
        });
    });
}

// Function to calculate mandays between two dates
function calculateMandays(startDate, endDate) {
    const timeDiff = endDate - startDate; // Difference in time (milliseconds)
    const daysDiff = timeDiff / (1000 * 3600 * 24); // Convert to days
    return Math.max(0, daysDiff); // Return 0 if daysDiff is negative
}

// Function to get individual employee cost
function getEmployeeCost(employeeId) {
    return new Promise((resolve, reject) => {
        const costSql = 'SELECT `EmployeeCost` FROM `Employees` WHERE EmployeeId = ?';
        connection.query(costSql, [employeeId], (err, results) => {
            if (err) {
                console.error('Error fetching employee cost:', err);
                return reject(err);
            }
            if (results && results.length > 0) {
                resolve(Number(results[0].EmployeeCost).toFixed(2)); // Return cost formatted to 00.00
            } else {
                resolve('0.00'); // Return 0 if no cost found, formatted as 00.00
            }
        });
    });
}

/**
 * @swagger
 * /costdata/GetModuleById:
 *   post:
 *     tags:
 *       - Module2
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
 *               ModuleName:
 *                 type: string
 *                 example: "New Module"
*     responses:
 *       200:
 *         description: Project and modules retrieved successfully
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
 *                   type: object
 *                   properties:
 *                     project:
 *                       type: object
 *                       properties:
 *                         ProjectId:
 *                           type: integer
 *                         ProjectName:
 *                           type: string
 *                     modules:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           ModuleId:
 *                             type: integer
 *                           ModuleName:
 *                             type: string
 *                           ModuleAddDate:
 *                             type: string
 *                             format: date
 *                           ModuleDueDate:
 *                             type: string
 *                             format: date
 *                           Employees:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 EmployeeName:
 *                                   type: string
 *                                 EmployeePosition:
 *                                   type: string
 *                                 EmployeeCost:
 *                                   type: number
 *       400:
 *         description: ProjectId or ProjectName must be provided
 *       404:
 *         description: No projects found
 *       500:
 *         description: Database query error
 */
router.post('/GetModuleById', (req, res) => {
    const { ProjectId, ProjectName, ModuleName } = req.body;

    if (ProjectId || ProjectName) {
        const checkProject = `
            SELECT ProjectName, ProjectId 
            FROM Projects 
            WHERE (ProjectId = ? OR ProjectName = ?)
        `;

        connection.query(checkProject, [ProjectId, ProjectName], (err, results) => {
            if (err) {
                console.error('Error fetching project:', err);
                return res.status(500).json({ status: 'error', message: 'Database query error', data: null });
            }

            if (results.length > 0) {
                const projectId = results[0].ProjectId;

                let selectModule;
                const queryParams = [projectId];

                if (ModuleName) {
                    selectModule = `
                        SELECT ModuleId, ModuleName, ModuleAddDate, ModuleDueDate 
                        FROM Modules 
                        WHERE ProjectId = ? AND ModuleName = ?
                    `;
                    queryParams.push(ModuleName);
                } else {
                    selectModule = `
                        SELECT ModuleId, ModuleName, ModuleAddDate, ModuleDueDate 
                        FROM Modules 
                        WHERE ProjectId = ?
                    `;
                }

                connection.query(selectModule, queryParams, (err, modules) => {
                    if (err) {
                        console.error('Error fetching modules:', err);
                        return res.status(500).json({ status: 'error', message: 'Database query error', data: null });
                    }

                    const formattedModules = modules.map(module => ({
                        ModuleId: module.ModuleId,
                        ModuleName: module.ModuleName,
                        ModuleAddDate: moment(module.ModuleAddDate).format('YYYY-MM-DD'),
                        ModuleDueDate: moment(module.ModuleDueDate).format('YYYY-MM-DD')
                    }));

                    const getAllProjectEmployees = `
                        SELECT e.EmployeeId, e.EmployeeName, g.GeneralName AS EmployeePosition, e.EmployeeCost 
                        FROM Employees e
                        JOIN General g ON e.RoleId = g.GeneralId
                        WHERE e.EmployeeId IN (
                            SELECT EmployeeId 
                            FROM Project_Employees 
                            WHERE ProjectId = ?
                        )
                    `;

                    connection.query(getAllProjectEmployees, [projectId], (err, allEmployees) => {
                        if (err) {
                            console.error('Error fetching project employees:', err);
                            return res.status(500).json({ status: 'error', message: 'Database query error', data: null });
                        }

                        const checkEmployeeInModule = (moduleId, employeeId) => {
                            return new Promise((resolve) => {
                                const employeeInModuleQuery = `
                                    SELECT EmployeeId 
                                    FROM Module_Employees 
                                    WHERE ModuleId = ? AND EmployeeId = ?
                                `;
                                connection.query(employeeInModuleQuery, [moduleId, employeeId], (err, results) => {
                                    if (err) {
                                        console.error('Error checking employee in module:', err);
                                        resolve(0);
                                    } else {
                                        resolve(results.length > 0 ? 1 : 0);
                                    }
                                });
                            });
                        };

                        const modulePromises = formattedModules.map(async (module) => {
                            const moduleStart = moment(module.ModuleAddDate);
                            const moduleEnd = moment(module.ModuleDueDate);
                            const moduleDays = moduleEnd.diff(moduleStart, 'days') + 1;

                            let moduleCost = 0;

                            const employeePromises = allEmployees.map(async (employee) => {
                                const inModule = await checkEmployeeInModule(module.ModuleId, employee.EmployeeId);
                                const employeeCost = inModule ? employee.EmployeeCost * moduleDays : 0;
                                moduleCost += employeeCost;

                                return {
                                    EmployeeName: employee.EmployeeName,
                                    EmployeePosition: employee.EmployeePosition,
                                    EmployeeCost: employee.EmployeeCost,
                                    InModule: inModule
                                };
                            });

                            const employees = await Promise.all(employeePromises);
                            return {
                                ...module,
                                Employees: employees,
                                ModuleCost: moduleCost // Add the calculated module cost here
                            };
                        });

                        Promise.all(modulePromises)
                            .then(modulesWithEmployees => {
                                return res.status(200).json({
                                    status: 'success',
                                    message: 'Project and modules retrieved successfully',
                                    data: {
                                        project: results[0],
                                        modules: modulesWithEmployees
                                    }
                                });
                            })
                            .catch(err => {
                                console.error('Error fetching modules with employees:', err);
                                return res.status(500).json({ status: 'error', message: 'Database query error', data: null });
                            });
                    });
                });
            } else {
                return res.status(404).json({ status: 'error', message: 'No projects found', data: null });
            }
        });
    } else {
        return res.status(400).json({ status: 'error', message: 'ProjectId or ProjectName must be provided', data: null });
    }
});


/**
 * @swagger
 * /costdata/GetEmployeeInProject:
 *   post:
 *     tags:
 *       - Employee 2
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
 *     responses:
 *       200:
 *         description: Employees retrieved successfully
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
 *                   type: object
 *                   properties:
 *                     employees:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           EmployeeName:
 *                             type: string
 *                             example: "John Doe"
 *                           EmployeePosition:
 *                             type: string
 *                             example: "Developer"
 *                           EmployeeCost:
 *                             type: number
 *                             example: 5000
 *       400:
 *         description: ProjectId or ProjectName must be provided
 *       404:
 *         description: No project found
 *       500:
 *         description: Database query error
 */
router.post('/GetEmployeeInProject', (req, res) => {
    const { ProjectName, ProjectId } = req.body;

    // Validate input
    if (!ProjectId && !ProjectName) {
        return res.status(400).json({ status: 'error', message: 'ProjectId or ProjectName must be provided', data: null });
    }

    // Check if the project exists
    const checkProject = `
        SELECT ProjectId, ProjectName
        FROM Projects 
        WHERE (ProjectId = ? OR ProjectName = ?)
    `;

    connection.query(checkProject, [ProjectId, ProjectName], (err, results) => {
        if (err) {
            console.error('Error fetching project:', err);
            return res.status(500).json({ status: 'error', message: 'Database query error', data: null });
        }

        // Check if any projects were found
        if (results.length > 0) {
            const projectId = results[0].ProjectId;
            const projectName = results[0].ProjectName;

            // Fetch all employees associated with the project
            const checkProjectEmployee = `
                SELECT EmployeeId 
                FROM Project_Employees 
                WHERE ProjectId = ?
            `;

            connection.query(checkProjectEmployee, [projectId], (err, projectEmployees) => {
                if (err) {
                    console.error('Error fetching project employees:', err);
                    return res.status(500).json({ status: 'error', message: 'Database query error', data: null });
                }

                if (projectEmployees.length === 0) {
                    return res.status(200).json({
                        status: 'success',
                        message: 'No employees found for this project',
                        data: {
                            ProjectId: projectId,
                            ProjectName: projectName,
                            employees: []
                        }
                    });
                }

                // Prepare an array to hold employee details and map them in Promises
                const employeeQueries = projectEmployees.map(projectEmployee => {
                    return new Promise((resolve, reject) => {
                        const getEmployeeInProject = `
                            SELECT e.EmployeeId, e.EmployeeName, g.GeneralName AS EmployeePosition, e.EmployeeCost
                            FROM Employees e
                            JOIN General g ON e.RoleId = g.GeneralId
                            WHERE e.EmployeeId = ?
                        `;

                        connection.query(getEmployeeInProject, [projectEmployee.EmployeeId], (err, employeeDetails) => {
                            if (err) {
                                reject(err);
                            } else {
                                const employeeInfo = {
                                    ...employeeDetails[0],
                                    InModule: 0
                                };
                                resolve(employeeInfo);
                            }
                        });
                    });
                });

                // Wait for all employee queries to complete
                Promise.all(employeeQueries)
                    .then(employeeResults => {
                        return res.status(200).json({
                            status: 'success',
                            message: 'Employees retrieved successfully',
                            data: {
                                ProjectId: projectId,
                                ProjectName: projectName,
                                employees: employeeResults.map(employee => ({
                                    ...employee,
                                    EmployeeCost: parseInt(employee.EmployeeCost, 10)
                                }))
                            }
                        });
                    })
                    .catch(err => {
                        console.error('Error fetching employee details:', err);
                        return res.status(500).json({ status: 'error', message: 'Database query error', data: null });
                    });
            });
        } else {
            return res.status(404).json({ status: 'error', message: 'No project found', data: null });
        }
    });
});


router.get('/GetProjectDesc', (req, res) => {
    // SQL query to select the latest project based on ProjectStart date
    const selectLatest = `
        SELECT 
            ProjectName 
        FROM 
            Projects
        ORDER BY 
            ProjectStart DESC
        LIMIT 1
    `;

    // SQL query to get the total number of projects and their total cost
    const countProjectsAndCost = `
        SELECT 
            COUNT(*) AS TotalProjects,
            SUM(ProjectCost) AS TotalProjectCost
        FROM 
            Projects
    `;

    // Fetch the latest project
    connection.query(selectLatest, (err, latestResults) => {
        if (err) {
            console.error('Error fetching latest project:', err);
            return res.status(500).json({ status: 'error', message: 'Database query error' });
        }

        // Fetch the total number of projects and their total cost
        connection.query(countProjectsAndCost, (err, countResults) => {
            if (err) {
                console.error('Error fetching total projects and cost:', err);
                return res.status(500).json({ status: 'error', message: 'Database query error' });
            }

            // Check if a latest project was found
            const latestProjectName = latestResults.length > 0 ? latestResults[0].ProjectName : "";

            // Get the total project count and cost
            const totalProjects = countResults.length > 0 ? countResults[0].TotalProjects : 0;
            // Convert totalProjectCost to a number without decimals
            const totalProjectCost = countResults.length > 0 ? Math.floor(countResults[0].TotalProjectCost) : 0;

            // Send the response
            res.status(200).json({
                status: 'success',
                data: {
                    LastedProject: latestProjectName,
                    TotalProject: totalProjects,
                    TotalCost: totalProjectCost, // Total cost of all projects as an integer
                }
            });
        });
    });
});

router.get('/GetAllEmployees', (req, res) => {
    const sql = `
        SELECT e.EmployeeId, e.EmployeeName, CAST(e.EmployeeCost AS SIGNED) AS EmployeeCost, g.GeneralName AS EmployeePosition
        FROM Employees e
        LEFT JOIN General g ON g.GeneralId = e.RoleId
    `;

    connection.query(sql, (err, employees) => {
        if (err) {
            console.error('Error fetching employees:', err);
            return sendResponse(res, 500, 'error', 'Error fetching employees', null);
        }

        if (employees.length === 0) {
            return sendResponse(res, 200, 'success', 'No employees found', null);
        }

        sendResponse(res, 200, 'success', 'Employees retrieved successfully', employees);
    });
});

router.post('/GetModuleInProject', (req, res) => {
    const { ProjectName, ProjectId } = req.body;

    if (!ProjectId && !ProjectName) {
        return res.status(400).json({ status: 'error', message: 'ProjectId or ProjectName must be provided', data: null });
    }

    const checkProject = `
        SELECT ProjectId, ProjectName
        FROM Projects 
        WHERE (ProjectId = ? OR ProjectName = ?)
    `;

    connection.query(checkProject, [ProjectId, ProjectName], (err, projects) => {
        if (err) {
            console.error('Error fetching project:', err);
            return res.status(500).json({ status: 'error', message: 'Database query error', data: null });
        }

        if (projects.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Project not found', data: null });
        }

        // Retrieve the ProjectId from the result
        const projectIdToUse = projects[0].ProjectId;

        const moduleQuery = `
            SELECT ModuleId, ModuleName, ModuleAddDate, ModuleDueDate
            FROM Modules
            WHERE ProjectId = ?
        `;

        connection.query(moduleQuery, [projectIdToUse], (err, modules) => {
            if (err) {
                console.error('Error fetching modules:', err);
                return res.status(500).json({ status: 'error', message: 'Error fetching modules', data: null });
            }

            if (modules.length === 0) {
                return res.status(200).json({ status: 'success', message: 'No modules found for this project', data: [] });
            }

            res.status(200).json({ status: 'success', message: 'Modules retrieved successfully', data: modules });
        });
    });
});





module.exports = router;