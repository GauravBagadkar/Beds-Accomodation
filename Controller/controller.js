const db = require('../Config/dbConfig');
const { Sequelize } = require('sequelize');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const transporter = require("../Config/nodemailerConfig");
const moment = require('moment');
const { validationResult } = require("express-validator");
const cron = require('node-cron');  // Add this for scheduling tasks

const Employee = db.employee;
const Rooms = db.rooms;
const Beds = db.beds;
const Booking = db.booking;

// room create :- 
exports.roomAddApi = async (req, res) => {
    try {
        const data1 = await Rooms.create({
            roomNumber: req.body.roomNumber
        })
        res.status(200).json({ success: 1, data: data1, message: "Room added successfully" });
    }
    catch (error) {
        console.log(error);
        res.status(200).json({ message: error.message });
    }
}

// bed create :- 
exports.bedAddApi = async (req, res) => {
    try {
        const data1 = await Beds.create({
            bedNumber: req.body.bedNumber,
            roomId: req.body.roomId
        })
        res.status(200).json({ success: 1, data: data1, message: "Bed added successfully" });
    }
    catch (error) {
        console.log(error);
        res.status(200).json({ message: error.message });
    }
}

// add employee :- 
exports.addEmployee = async (req, res) => {
    try {
        const emp = await Employee.create({
            name: req.body.name,
            email: req.body.email,
            contact: req.body.contact,
            gender: req.body.gender,
            dob: req.body.dob,
            address: req.body.address,
            deptName: req.body.deptName,
            roleName: req.body.roleName,
            password: req.body.password
        })
        res.status(200).json({ success: 1, data: emp, message: "Employee added successfully" });
    }
    catch (error) {
        console.log(error);
        res.status(200).json({ message: error.message });
    }
}

// login enmployee:-
exports.empLogin = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ success: 0, error: "Email or Password fields cannot be empty!" });
        return;
    }
    try {
        const emailExist = await Employee.findOne({
            where: { email },
            raw: true
        })
        if (!emailExist) {
            res.status(400).json({ success: 0, message: "email not exist" });
        }

        if (password == emailExist.password) {
            emailExist.password = undefined;
            res.status(200).json({ success: 1, message: "Login Successfully", data: emailExist });
        } else {
            res.status(401).json({ error: "Invalid credentials" });
        }
    }

    catch (error) {
        console.log(error);
        res.status(400).json({ success: 0, message: error.message })
    }
}

// Get user profile by ID
exports.getProfile = async (req, res) => {
    const { id } = req.body;
    try {
        const user = await Employee.findOne({
            where: { id },
            raw: true,
            attributes: ['id', 'name', 'email', 'gender', 'deptName', 'contact']
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ success: 1, data: user });

    } catch (error) {
        console.log(error);
        res.status(400).json({ success: 0, message: error.message })
    }
};

// booking beds :-
exports.bookingBeds = async (req, res) => {
    const { empId, bedId, loggedInDate, loggedOutDate } = req.body;

    try {
        // Get employee details to check gender
        const employee = await Employee.findOne({ where: { id: empId } });
        if (!employee) {
            return res.status(404).json({ success: 0, message: "Employee not found" });
        }

        // Set bed range based on gender
        let bedRange;
        if (employee.gender === 'Female') {
            bedRange = [1, 9];
        } else if (employee.gender === 'Male') {
            bedRange = [10, 18];
        }

        // Check if the selected bedId is within the allowed range
        const bed = await Beds.findOne({
            where: { id: bedId },
            include: { model: Rooms, as: "tbl_rooms" }
        });

        if (!bed) {
            return res.status(404).json({ message: "Bed not found" });
        }

        if (bed.bedNumber < bedRange[0] || bed.bedNumber > bedRange[1]) {
            return res.status(400).json({
                message: `Bed number ${bed.bedNumber} is not allowed for ${employee.gender} employees`
            });
        }

        // Check if the bed is already booked during the new booking's loggedInDate to loggedOutDate
        const overlappingBooking = await Booking.findOne({
            where: {
                bedId,
                isCancel: 0,  // Exclude canceled bookings
                [Op.and]: [
                    { loggedInDate: { [Op.lte]: loggedOutDate } },
                    { loggedOutDate: { [Op.gte]: loggedInDate } }
                ]
            }
        });

        if (overlappingBooking) {
            return res.status(400).json({
                success: 0,
                message: `This bed is already booked from date: ${overlappingBooking.loggedInDate} to date: ${overlappingBooking.loggedOutDate}`
            });
        }

        const room = bed.tbl_rooms;
        if (!room) {
            return res.status(404).json({ message: "Room not found for the selected bed" });
        }

        // Create the booking record (without setting bedStatus to true yet)
        const booking = await Booking.create({
            empId,
            name: employee.name,
            email: employee.email,
            deptName: employee.deptName,
            roomNumber: room.roomNumber,
            bedNumber: bed.bedNumber,
            bedId,
            loggedInDate,
            loggedOutDate,
            bedStatus: true
        });

        // Read the HTML template file
        const filePath = path.join(__dirname, "../Public/booking.html");
        let htmlContent = fs.readFileSync(filePath, 'utf8');

        // Replace placeholders in the HTML file with dynamic data
        htmlContent = htmlContent
            .replace('${employee.name}', employee.name)
            .replace('${booking.roomNumber}', booking.roomNumber)
            .replace('${booking.bedNumber}', booking.bedNumber)
            .replace('${loggedInDate}', loggedInDate)
            .replace('${loggedOutDate}', loggedOutDate);

        // Send mail with defined transport object
        const info = await transporter.sendMail({
            from: 'bloodyindiansparrow@gmail.com', // sender address
            to: employee.email, // list of receivers
            subject: "Beds Accommodation Mail :- ",
            html: htmlContent
        });
        console.log("Email Sent:%s", info.messageId);

        res.status(200).json({ success: 1, data: booking, message: "Booking Created. Bed will be marked as booked on the loggedInDate." });

    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message });
    }
};

// search name for booking :-
exports.bookingSearchName = async (req, res) => {
    try {
        const { name } = req.body;
        let whereConditions = {};
        if (name) {
            whereConditions = {
                name: { [Op.iLike]: `${name}%` }
            };
        }
        const showData = await Employee.findAll({
            where: whereConditions,
            attributes: ['name', 'id', 'deptName', 'email'],
        });
        if (showData.length > 0) {
            res.status(200).json({ success: 1, data: showData });
        } else {
            res.status(404).json({ success: 0, message: 'No user found with the given name.' });
        }
    } catch (error) {
        console.log(error)
        res.status(400).json({ success: 0, message: error.message })
    }
}

// Get Employee List  :-
exports.getEmployeeList = async (req, res) => {
    try {
        const bookings = await Employee.findAll({
            attributes: { exclude: ['password'] }
        });
        res.status(200).json({ success: 1, data: bookings });
    } catch (error) {
        res.status(400).json({ error: 'Failed to retrieve Employee Details.' });
    }
}

// //view and extend bookng original :-
// exports.viewExtendBooking = async (req, res) => {
//     try {
//         const viewBooking = await Booking.findOne({
//             attributes: [
//                 [Sequelize.col('"tbl_employees"."name"'), "name"],
//                 [Sequelize.col('"tbl_employees"."deptName"'), "deptName"],
//                 [Sequelize.col('"tbl_beds->tbl_rooms"."roomNumber"'), "roomNumber"],
//                 [Sequelize.col('"tbl_beds"."bedNumber"'), "bedNumber"],
//                 'loggedInDate', 'loggedOutDate', 'bedStatus'
//             ],
//             include: [
//                 {
//                     model: Employee,
//                     as: "tbl_employees",
//                     attributes: []
//                 },
//                 {
//                     model: Beds,
//                     as: "tbl_beds",
//                     attributes: [],
//                     include: {
//                         model: Rooms,
//                         as: "tbl_rooms",
//                         attributes: []
//                     }
//                 }
//             ],
//             where: {
//                 bedId: req.body.bedId,
//                 id: req.body.bookingId
//             },
//             raw: true
//         });

//         if (!viewBooking) {
//             return res.status(404).json({ success: 0, message: 'Booking not found' });
//         }

//         if (!viewBooking.bedStatus) {
//             return res.status(400).json({ success: 0, message: 'Bed status is false/vacant; cannot update loggedOutDate' });
//         }

//         const overlappingBooking = await Booking.findOne({
//             where: {
//                 bedId: req.body.bedId,
//                 id: { [Sequelize.Op.ne]: req.body.bookingId },
//                 bedStatus: true,
//                 loggedInDate: { [Sequelize.Op.gt]: viewBooking.loggedOutDate }
//             },
//             order: [['loggedInDate', 'ASC']],
//             raw: true
//         });

//         if (overlappingBooking) {
//             const maxExtendDate = new Date(overlappingBooking.loggedInDate);
//             maxExtendDate.setDate(maxExtendDate.getDate() - 1);

//             if (new Date(req.body.loggedOutDate) > maxExtendDate) {
//                 return res.status(400).json({
//                     success: 0,
//                     message: `Cannot extend beyond ${maxExtendDate.toLocaleDateString()}. Another booking exists from ` +
//                         `${new Date(overlappingBooking.loggedInDate).toLocaleDateString()} to ${new Date(overlappingBooking.loggedOutDate).toLocaleDateString()}`
//                 });
//             }
//         }

//         if (new Date(req.body.loggedOutDate) <= new Date(viewBooking.loggedOutDate)) {
//             return res.status(400).json({
//                 success: 0, message: 'New logged out date must be after the current logged out date'
//             });
//         }

//         // If within allowed range, proceed with the update
//         const updateBooking = await Booking.update(
//             {
//                 loggedOutDate: req.body.loggedOutDate
//             },
//             {
//                 where: {
//                     bedId: req.body.bedId,
//                     id: req.body.bookingId
//                 }
//             }
//         );

//         res.status(200).json({
//             success: 1, message: 'Booking extended successfully', data1: viewBooking, data2: updateBooking
//         });

//     } catch (error) {
//         console.log('Error in viewExtendBooking:', error);
//         res.status(500).json({ success: 0, message: error.message });
//     }
// };

// view and extend booking:
exports.viewExtendBooking = async (req, res) => {
    try {
        const viewBooking = await Booking.findOne({
            attributes: [
                [Sequelize.col('"tbl_employees"."name"'), "name"],
                [Sequelize.col('"tbl_employees"."deptName"'), "deptName"],
                [Sequelize.col('"tbl_beds->tbl_rooms"."roomNumber"'), "roomNumber"],
                [Sequelize.col('"tbl_beds"."bedNumber"'), "bedNumber"],
                'loggedInDate', 'loggedOutDate', 'bedStatus'
            ],
            include: [
                {
                    model: Employee,
                    as: "tbl_employees",
                    attributes: []
                },
                {
                    model: Beds,
                    as: "tbl_beds",
                    attributes: [],
                    include: {
                        model: Rooms,
                        as: "tbl_rooms",
                        attributes: []
                    }
                }
            ],
            where: {
                bedId: req.body.bedId,
                id: req.body.bookingId
            },
            raw: true
        });

        if (!viewBooking) {
            return res.status(404).json({ success: 0, message: 'Booking not found' });
        }

        if (!viewBooking.bedStatus) {
            return res.status(400).json({ success: 0, message: 'Bed status is false/vacant; cannot update loggedOutDate' });
        }

        const overlappingBooking = await Booking.findOne({
            where: {
                bedId: req.body.bedId,
                id: { [Sequelize.Op.ne]: req.body.bookingId },
                bedStatus: true,
                loggedInDate: { [Sequelize.Op.gt]: viewBooking.loggedOutDate }
            },
            order: [['loggedInDate', 'ASC']],
            raw: true
        });

        if (overlappingBooking) {
            const maxExtendDate = new Date(overlappingBooking.loggedInDate);
            maxExtendDate.setDate(maxExtendDate.getDate() - 1);

            if (new Date(req.body.loggedOutDate) > maxExtendDate) {
                return res.status(400).json({
                    success: 0,
                    message: `Cannot extend beyond ${maxExtendDate.toLocaleDateString()}. Another booking exists from ` +
                        `${new Date(overlappingBooking.loggedInDate).toLocaleDateString()} to ${new Date(overlappingBooking.loggedOutDate).toLocaleDateString()}`
                });
            }
        }

        // Allow the `loggedOutDate` update without checking if it's before or after the current date
        const updateBooking = await Booking.update(
            {
                loggedOutDate: req.body.loggedOutDate
            },
            {
                where: {
                    bedId: req.body.bedId,
                    id: req.body.bookingId
                }
            }
        );

        res.status(200).json({
            success: 1, message: 'Booking updated successfully', data1: viewBooking, data2: updateBooking
        });

    } catch (error) {
        console.log('Error in viewExtendBooking:', error);
        res.status(500).json({ success: 0, message: error.message });
    }
};

//checkBeds Homepage Corrected :-
exports.checkBeds = async (req, res) => {
    const { date, filterType } = req.body;
    try {
        // Convert date to UTC to ensure consistency across environments
        const utcDate = new Date(date + 'T00:00:00Z').toISOString().split('T')[0];

        let roomNumbers = [101, 102, 103, 104];
        if (filterType === "Female") {
            roomNumbers = [101, 102];
        } else if (filterType === "Male") {
            roomNumbers = [103, 104];
        }

        // Fetch all beds based on room filter
        const allBeds = await Beds.findAll({
            include: {
                model: Rooms,
                as: "tbl_rooms",
                where: {
                    roomNumber: { [Op.in]: roomNumbers }
                }
            },
            order: [
                [{ model: Rooms, as: 'tbl_rooms' }, 'roomNumber', 'ASC'],
                ['bedNumber', 'ASC']
            ]
        });

        // Fetch all bookings where the bed is either booked or vacated today
        const bookings = await Booking.findAll({
            where: {
                roomNumber: { [Op.in]: roomNumbers },
                // Include beds booked on or before today and not vacated before today
                [Op.or]: [
                    {
                        loggedInDate: { [Op.lte]: utcDate },
                        loggedOutDate: { [Op.gte]: utcDate }, // Bed is still booked today
                        isCancel: 0
                    },
                    {
                        loggedOutDate: utcDate, // Bed is vacated today
                        isCancel: 1 // Ensure it's marked as vacant
                    }
                ]
            },
            include: [
                {
                    model: Beds,
                    as: "tbl_beds",
                    include: [{ model: Rooms, as: "tbl_rooms" }]
                },
                {
                    model: Employee,
                    as: "tbl_employees"
                }
            ]
        });

        // Create a map to group beds by room number
        const roomBedMap = new Map();

        // Initialize the map with empty arrays for each room
        roomNumbers.forEach(roomNumber => { roomBedMap.set(roomNumber, []); });

        // Populate the map with bed information (initially mark all beds as vacant)
        for (const bed of allBeds) {
            const roomNumber = bed.tbl_rooms?.roomNumber;
            if (roomNumber && roomBedMap.has(roomNumber)) {
                const bedInfo = {
                    bedNumber: bed.bedNumber,
                    bedStatus: false, // Default to vacant
                };
                roomBedMap.get(roomNumber).push(bedInfo);
            }
        }

        // Update bed information based on the bookings fetched
        for (const booking of bookings) {
            if (!booking.tbl_beds) {
                console.warn(`Warning: Booking ${booking.id} has no associated bed`);
                continue;
            }

            const roomNumber = booking.tbl_beds.tbl_rooms?.roomNumber;
            if (roomNumber && roomBedMap.has(roomNumber)) {
                const bedIndex = roomBedMap.get(roomNumber).findIndex(bed => bed.bedNumber === booking.tbl_beds.bedNumber);

                if (bedIndex !== -1) {
                    // If isCancel is 1 and loggedOutDate is today, the bed is vacant
                    if (booking.isCancel === 1) {
                        roomBedMap.get(roomNumber)[bedIndex] = {
                            ...roomBedMap.get(roomNumber)[bedIndex],
                            // bedStatus: false,
                            isCancel: 1, // Ensure it's vacant
                        };
                    } else {
                        // Otherwise, mark it as booked
                        roomBedMap.get(roomNumber)[bedIndex] = {
                            ...roomBedMap.get(roomNumber)[bedIndex],
                            bedStatus: true, // Mark as booked
                            bookingId: booking.id,
                            employee: booking.tbl_employees ? booking.tbl_employees.name : "No Employee Data",
                            loggedInDate: booking.loggedInDate,
                            loggedOutDate: booking.loggedOutDate
                        };
                    }
                }
            }
        }

        // Convert the map to the desired response format and sort beds
        const responseData = Array.from(roomBedMap, ([roomNumber, beds]) => ({
            roomNumber,
            beds: beds.sort((a, b) => a.bedNumber - b.bedNumber) // Sort beds by bedNumber
        }));

        res.status(200).json({ success: 1, data: responseData });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: 0, message: error.message });
    }
};

// book bed to vacant :-
exports.bookToVacantBed = async (req, res) => {
    try {
        const { bookingId, bedId, loggedOutDate } = req.body;
        // Find the booking by bookingId
        const booking = await Booking.findOne({
            where: { id: bookingId }
        });

        if (!booking) {
            return res.status(404).json({ success: 0, message: 'No active booking found for this bed' });
        }

        // // Update the loggedOutDate with the current date (vacating the bed)
        // const currentDate = new Date();

        // Update the Booking record with the provided date range and bedStatus
        const updateBooking = await Booking.update({
            loggedOutDate: loggedOutDate,
            bedStatus: 'false'
        }, {
            where: {
                id: bookingId,
                bedId: bedId
            }
        });

        // Fetch employee details from the booking
        const employee = await Employee.findOne({
            where: { id: booking.empId }
        });

        if (!employee) {
            return res.status(404).json({ success: 0, message: 'Employee not found' });
        }

        // Read the HTML template file
        const filePath = path.join(__dirname, "../Public/vacant.html");
        let htmlContent = fs.readFileSync(filePath, 'utf8');

        // Convert loggedOutDate to a readable format, if needed
        const formattedLoggedOutDate = new Date(loggedOutDate).toDateString();  // Format loggedOutDate

        // Replace placeholders in the HTML file with dynamic data
        htmlContent = htmlContent
            .replace('${employee.name}', employee.name)
            .replace('${booking.roomNumber}', booking.roomNumber)
            .replace('${booking.bedNumber}', booking.bedNumber)
            .replace('${loggedOutDate}', formattedLoggedOutDate);

        // Send mail with defined transport object
        const info = await transporter.sendMail({
            from: 'bloodyindiansparrow@gmail.com', // sender address
            to: employee.email, // list of receivers
            subject: "Beds Accommodation Mail :- ",
            html: htmlContent
        });
        console.log("Email Sent: %s", info.messageId);

        res.status(200).json({ success: 1, message: 'Bed successfully vacated, bedStatus updated, and email sent.' });

    } catch (error) {
        console.log(error);
        res.status(400).json({ success: 0, message: error.message });
    }
};

// // Get Booking History :-
// exports.getBookingHistory = async (req, res) => {
//     try {
//         const bookings = await Booking.findAll();
//         res.status(200).json({ success: 1, data: bookings });
//     } catch (error) {
//         res.status(400).json({ error: 'Failed to retrieve booking history.' });
//     }
// }

// Get Booking History with Pagination
exports.getBookingHistory = async (req, res) => {
    try {
        const limit = parseInt(req.body.limit) || 10; // Default limit to 10
        const page = parseInt(req.body.page) || 1; // Default page to 1
        const offset = (page - 1) * limit; // Calculate offset

        const { rows: bookings, count: totalCount } = await Booking.findAndCountAll({
            limit,
            offset,
        });

        res.status(200).json({
            success: 1,
            data: bookings,
            pagination: {
                totalRows: bookings.length,
                totalCount,
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit),
            },
        });
    } catch (error) {
        res.status(400).json({ error: 'Failed to retrieve booking history.' });
    }
};


// sorted booking history :-
exports.formattedBookingHistory = async (req, res) => {
    try {
        // Fetching all booking records with selected constant and dynamic fields
        const bookings = await Booking.findAll({
            attributes: [
                'id', 'empId', 'name', 'deptName', 'email', // Constant data
                'roomNumber', 'bedNumber', 'bedId', 'loggedInDate', 'loggedOutDate', 'isCancel' // Dynamic data
            ],
            order: [['loggedInDate', 'DESC']]
        });

        const bookingHistory = {};

        for (const booking of bookings) {

            if (!bookingHistory[booking.empId]) {

                bookingHistory[booking.empId] = {
                    empId: booking.empId,
                    name: booking.name,
                    deptName: booking.deptName,
                    email: booking.email,
                    bookingDetails: []
                };
            }

            bookingHistory[booking.empId].bookingDetails.push({
                id: booking.id,
                roomNumber: booking.roomNumber,
                bedNumber: booking.bedNumber,
                bedId: booking.bedId,
                loggedInDate: booking.loggedInDate,
                loggedOutDate: booking.loggedOutDate,
                isCancel: booking.isCancel
            });
        }

        // Convert the bookingHistory object to an array
        const result = Object.values(bookingHistory);

        res.status(200).json({ success: 1, data: result });

    } catch (error) {
        res.status(400).json({ success: 0, message: error.message, error: 'Failed to retrieve booking history.' });
    }
}

// get booking data by search :-
exports.searchName = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(200).json({ message: errors.array()[0].msg });
            return;
        } else {
            const { name, deptName } = req.body;

            const whereConditions = {
                [Op.or]: []
            };

            if (name) {
                whereConditions[Op.or].push({
                    name: { [Op.iLike]: `%${name}%` }
                });
            }

            if (deptName) {
                whereConditions[Op.or].push({
                    deptName: { [Op.iLike]: `%${deptName}%` }
                });
            }

            const showData = await Booking.findAll({ where: whereConditions });

            if (showData.length != 0) {
                res.status(200).json({ success: 1, showingBooking: showData, message: "data search successfully" });
            } else {
                res.status(200).json({ success: 0, showingUser: showData, message: "users not found" });
            }
        }
    }
    catch (error) {
        console.log(error);
        res.status(200).json({ success: 0, message: error.message });
    }
}

// Download All EXCEL Booking History by Month and Year
exports.getAllBookingExcel = async (req, res) => {
    try {
        const { month, year } = req.body;

        if (!month || !year) {
            return res.status(400).json({ success: 0, message: "Month and year are required in the request body" });
        }

        // Format start and end date for the month
        const startDate = moment(`${year}-${month}-01`).startOf('month').format('YYYY-MM-DD');
        const endDate = moment(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');

        // Fetch filtered bookings for the specified month and year
        const bookings = await Booking.findAll({
            where: {
                [Op.or]: [
                    {
                        loggedInDate: {
                            [Op.between]: [startDate, endDate]
                        }
                    },
                    {
                        loggedOutDate: {
                            [Op.between]: [startDate, endDate]
                        }
                    },
                    {
                        // Handles cases where the booking spans across months
                        loggedInDate: {
                            [Op.lte]: endDate
                        },
                        loggedOutDate: {
                            [Op.gte]: startDate
                        }
                    }
                ]
            }
        });

        // Create a new Excel workbook and add a worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Bookings');

        // Define the columns for the worksheet
        worksheet.columns = [
            { header: 'Employee ID', key: 'empId', width: 15 },
            { header: 'Name', key: 'name', width: 20 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Department', key: 'deptName', width: 20 },
            { header: 'Room Number', key: 'roomNumber', width: 15 },
            { header: 'Bed Number', key: 'bedNumber', width: 15 },
            { header: 'Booking Date', key: 'loggedInDate', width: 20 },
            { header: 'Logged Out Date', key: 'loggedOutDate', width: 20 },
            { header: 'Booking Status', key: 'bedStatus', width: 15 },
            { header: 'Is Cancel', key: 'isCancel', width: 10 }
        ];

        // Add rows to the worksheet by converting booking objects into a suitable format
        worksheet.addRows(bookings.map(booking => ({
            empId: booking.empId,
            name: booking.name,
            email: booking.email,
            deptName: booking.deptName,
            roomNumber: booking.roomNumber,
            bedNumber: booking.bedNumber,
            loggedInDate: booking.loggedInDate ? moment(booking.loggedInDate).format('YYYY-MM-DD') : 'N/A',
            loggedOutDate: booking.loggedOutDate ? moment(booking.loggedOutDate).format('YYYY-MM-DD') : 'N/A',
            bedStatus: booking.bedStatus ? 'Booked' : 'Vacant',
            isCancel: booking.isCancel,
        })));

        // Set the response headers to download the Excel file
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', `attachment; filename=Bookings_${year}_${month}.xlsx`);

        // Write the workbook to the response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Failed to download Excel file' });
    }
};

// Download EXCEL Booking History :-
exports.EXCELdownloadBookingHistory = async (req, res) => {
    try {
        const { name, month } = req.body;
        const year = moment().year();

        // Building query conditions based on the filters
        const whereConditions = {};

        if (name) {
            whereConditions.name = {
                [Op.iLike]: `%${name}%`
            };
        }

        if (month) {

            const startDate = moment(`${year}-${month}-01`).startOf('month').format('YYYY-MM-DD');
            const endDate = moment(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');

            whereConditions.loggedInDate = {
                [Op.between]: [startDate, endDate]
            };
        }

        // Fetch filtered bookings based on the conditions
        const bookings = await Booking.findAll({ where: whereConditions });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Bookings');

        worksheet.columns = [
            { header: 'Employee ID', key: 'empId', width: 15 },
            { header: 'Name', key: 'name', width: 15 },
            { header: 'Email', key: 'email', width: 15 },
            { header: 'Department', key: 'deptName', width: 15 },
            { header: 'Room Number', key: 'roomNumber', width: 10 },
            { header: 'Bed Number', key: 'bedNumber', width: 10 },
            { header: 'Booking Date', key: 'loggedInDate', width: 15 },
            { header: 'Logged Out Date', key: 'loggedOutDate', width: 15 },
            { header: 'Is Cancel', key: 'isCancel', width: 10 }
        ];

        // Adding the rows to the worksheet
        worksheet.addRows(bookings.map(booking => booking.toJSON()));

        // Set the headers for downloading the Excel file
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', 'attachment; filename=bookings.xlsx');

        // Send the Excel file as a response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        res.status(500).json({ error: 'Failed to download Excel file' });
    }
};

// Cancel Booking :-
exports.cancelBooking = async (req, res) => {
    try {
        const { bookingId, bedId } = req.body;
        const booking = await Booking.findOne({
            where: { id: bookingId }
        });

        if (!booking) {
            return res.status(404).json({ success: 0, message: 'Booking Not Found' });
        }

        // Check if the booking is already canceled
        if (booking.isCancel === 1) {
            return res.status(400).json({ success: 0, message: 'Booking is already canceled.' });
        }

        const cancelBooking = await Booking.update({
            bedStatus: 'false',
            isCancel: 1
        }, {
            where: {
                id: bookingId,
                bedId: bedId
            }
        })

        // Fetch employee details from the booking
        const employee = await Employee.findOne({
            where: { id: booking.empId }
        });

        if (!employee) {
            return res.status(404).json({ success: 0, message: 'Employee not found' });
        }

        // Read the HTML template file
        const filePath = path.join(__dirname, "../Public/bookingCancel.html");
        let htmlContent = fs.readFileSync(filePath, 'utf8');

        // Replace placeholders in the HTML file with dynamic data
        htmlContent = htmlContent
            .replace('${employee.name}', employee.name)
            .replace('${booking.roomNumber}', booking.roomNumber)
            .replace('${booking.bedNumber}', booking.bedNumber)
            .replace('${loggedInDate}', booking.loggedInDate)
            .replace('${loggedOutDate}', booking.loggedOutDate);

        // Send mail with defined transport object
        const info = await transporter.sendMail({
            from: 'bloodyindiansparrow@gmail.com', // sender address
            to: employee.email, // list of receivers
            subject: "Beds Accommodation Mail :- ",
            html: htmlContent
        });
        console.log("Email Sent: %s", info.messageId);


        res.status(200).json({ success: 1, message: 'Booking successfully Cancel and Email sent.' });

    } catch (error) {
        console.log(error);
        res.status(400).json({ success: 0, message: error.message });
    }
}

// // list of available beds :-
// exports.getAvailableBeds = async (req, res) => {
//     const { loggedInDate, loggedOutDate, gender, bedId } = req.body;

//     try {
//         const availableBeds = await Booking.findAll({
//             where: {
//                 bedStatus: false,
//                 gender: gender,
//                 ...(bedId && { bedId }), // add bedId filter if provided
//                 [Op.or]: [
//                     {
//                         loggedOutDate: { [Op.lt]: loggedInDate } // booked dates end before the requested start date
//                     },
//                     {
//                         loggedInDate: { [Op.gt]: loggedOutDate } // booked dates start after the requested end date
//                     }
//                 ]
//             }
//         });

//         res.json({ availableBeds });
//     } catch (error) {
//         res.status(500).json({ message: "Error retrieving available beds", error });
//     }
// };

// list
exports.getAvailableBeds = async (req, res) => {
    const { loggedInDate, loggedOutDate } = req.body;

    try {
        if (!loggedInDate || !loggedOutDate) {
            return res.status(400).json({ message: 'Both loggedInDate and loggedOutDate are required.' });
        }

        // Convert input dates to Date objects for comparison
        const startDate = new Date(loggedInDate);
        const endDate = new Date(loggedOutDate);

        // Find all beds where `bedStatus` is `false` and the bed is vacant for the specified date range
        const vacantBeds = await Booking.findAll({
            where: {
                bedStatus: false,
                [Op.or]: [
                    {
                        loggedInDate: {
                            [Op.gt]: endDate // Booking starts after the requested end date
                        }
                    },
                    {
                        loggedOutDate: {
                            [Op.lt]: startDate // Booking ends before the requested start date
                        }
                    }
                ]
            },
            attributes: ['bedNumber'] // Adjust fields as needed
        });

        // Respond with the list of vacant beds
        res.status(200).json({
            success: 1, message: 'Available vacant beds for the specified date range', data: vacantBeds
        });
    } catch (error) {
        console.error("Error fetching vacant beds:", error);
        res.status(500).json({ success: 0, message: 'Server error while fetching vacant beds' });
    }
};

