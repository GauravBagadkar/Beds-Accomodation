const db = require('../Config/dbConfig');
const { Sequelize } = require('sequelize');
const { Op } = require('sequelize');

const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const ExcelJS = require('exceljs');
//const PDFDocument = require('pdfkit');
const fs = require('fs');
const moment = require('moment');
const { validationResult } = require("express-validator");
const filterData = require("filter-data");

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
        res.status(400).json({ message: error.message })
    }
}

// booking Beds + email :-   
exports.bookingBeds = async (req, res) => {
    const { empId, bedId, loggedInDate, loggedOutDate } = req.body;

    try {
        // Get employee details to check gender
        const employee = await Employee.findOne({ where: { id: req.body.empId } });
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
            where: { id: bedId }, include: { model: Rooms, as: "tbl_rooms" }

        });

        if (!bed) {
            return res.status(404).json({ message: "Bed not found" });
        }

        if (bed.bedNumber < bedRange[0] || bed.bedNumber > bedRange[1]) {
            return res.status(400).json({
                message: `Bed number ${bed.bedNumber} is not allowed for ${employee.gender} employees`
            });
        }


        // Check if the bed is already booked
        if (bed.bedStatus === true) {
            return res.status(400).json({ success: 0, message: "This bed is already booked" });
        }

        const room = bed.tbl_rooms;  // Assuming Beds has a relationship with Rooms
        if (!room) {
            return res.status(404).json({ message: "Room not found for the selected bed" });
        }
        // const room = await Rooms.findOne({ where: { id: bedId } });

        // Create booking
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
        });

        // Mark the bed as booked
        await Beds.update(
            { bedStatus: true },
            { where: { id: bedId } }
        );

        res.status(200).json({ success: 1, data: booking, message: "Booking Completed" });

    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message });
    }
};

// get all booking data:-
exports.viewUpdateBooking = async (req, res) => {
    try {
        const viewBooking = await Booking.findOne({
            attributes: [
                [Sequelize.col('"tbl_employees"."name"'), "name"],
                [Sequelize.col('"tbl_employees"."deptName"'), "deptName"],
                [Sequelize.col('"tbl_beds->tbl_rooms"."roomNumber"'), "roomNumber"],
                [Sequelize.col('"tbl_beds"."bedNumber"'), "bedNumber"],
                'loggedInDate', 'loggedOutDate',
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
                bedId: req.body.bedId
            },
            raw: true
        })

        const updateBooking = await Booking.update({
            loggedOutDate: req.body.loggedOutDate
        },
            { where: { bedId: req.body.bedId } }
        )

        res.status(200).json({ success: 1, data1: viewBooking, data2: updateBooking });
    } catch (error) {
        console.log(error);
        res.status(200).json({ message: error.message });
    }
}

// Check bed availability and dashboard representation
exports.checkBeds = async (req, res) => {
    const { date, filterType } = req.body;

    try {

        let roomNumbers = [];
        if (filterType === "Female") {
            roomNumbers = [101, 102];
        } else if (filterType === "Male") {
            roomNumbers = [103, 104];
        }

        const allBeds = await Beds.findAll({
            include: {
                model: Rooms,
                as: "tbl_rooms",
                where: {
                    roomNumber: roomNumbers.length > 0 ? { [Op.in]: roomNumbers } : { [Op.ne]: null }
                }
            }
        });

        const bookedBeds = await Booking.findAll({
            where: {
                loggedInDate: { [Op.lte]: date },
                loggedOutDate: { [Op.gte]: date },
                roomNumber: roomNumbers.length > 0 ? { [Op.in]: roomNumbers } : { [Op.ne]: null }
            },
            include: [
                {
                    model: Beds,
                    as: "tbl_beds",
                    include: [{ model: Rooms, as: "tbl_rooms" }],
                },
                {
                    model: Employee,
                    as: "tbl_employees",
                },
            ],
        });

        // Create a set of booked bed IDs for easy lookup
        const bookedBedIds = new Set(bookedBeds.map((booking) => booking.bedId));

        // Separate vacant beds by checking if bed is not booked
        const vacantBeds = allBeds.filter((bed) => !bookedBedIds.has(bed.id) && bed.bedStatus === false);

        res.status(200).json({
            success: true,
            data: {
                vacantBeds: vacantBeds.map((bed) => ({
                    roomNumber: bed.tbl_rooms.roomNumber,
                    bedNumber: bed.bedNumber,
                })),
                bookedBeds: bookedBeds.map((booking) => ({
                    employee: booking.tbl_employees ? booking.tbl_employees.name : "No Employee Data",
                    roomNumber: booking.tbl_beds.tbl_rooms.roomNumber,
                    bedNumber: booking.tbl_beds.bedNumber,
                    loggedInDate: booking.loggedInDate,
                    loggedOutDate: booking.loggedOutDate,
                })),
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message, message: "Internal server error" });
    }
};

// book bed to vacant + email:-
exports.bookToVacantBed = async (req, res) => {
    try {
        const bedId = req.body.bedId;

        const booking = await Booking.findOne({
            where: { bedId: bedId }
        });

        if (!booking) {
            return res.status(404).json({ success: 0, message: 'No active booking found for this bed' });
        }

        // Update the loggedOutDate with the current date (vacating the bed)
        const currentDate = new Date();
        await Booking.update({
            loggedOutDate: currentDate
        }, {
            where: { bedId: bedId }
        });

        // Mark the bed as 'vacant' in the beds table
        await Beds.update({
            bedStatus: 'false'
        }, {
            where: { id: bedId }
        });

        res.status(200).json({ success: 1, message: 'Bed successfully vacated and loggedOutDate updated' });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: 0, message: error.message });
    }
};

// Get Booking History :-
exports.getBookingHistory = async (req, res) => {
    try {
        const bookings = await Booking.findAll();
        res.status(200).json({ success: 1, data: bookings });
    } catch (error) {
        res.status(400).json({ error: 'Failed to retrieve booking history.' });
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

// Get Booking history by month :-
exports.getBookingsByMonth = async (req, res) => {
    try {
        const { month } = req.body;
        const year = moment().year();

        if (!month) {
            return res.status(400).json({ success: 0, message: "Month is required in query parameter" });
        }

        // Format start and end date for the month
        const startDate = moment(`${year}-${month}-01`).startOf('month').format('YYYY-MM-DD');
        const endDate = moment(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');

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
                        // Handles cases where the booking spans across months (loggedInDate before and loggedOutDate after the month)
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

        return res.status(200).json({ success: 1, data: bookings });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message, error: 'Internal Server Error' });
    }
};

// Download CSV Booking History :-
exports.CSVdownloadBookingHistory = async (req, res) => {
    try {
        const bookings = await Booking.findAll();

        const csvWriter = createCsvWriter({
            path: 'bookings.csv',
            header: [
                { id: 'empId', title: 'Employee ID' },
                { id: 'name', title: 'Name' },
                { id: 'email', title: 'Email' },
                { id: 'deptName', title: 'Department' },
                { id: 'roomNumber', title: 'Room Number' },
                { id: 'bedNumber', title: 'Bed Number' },
                { id: 'loggedInDate', title: 'Booking Date' },
                { id: 'loggedOutDate', title: 'Logged Out Date' }
            ]
        });

        await csvWriter.writeRecords(bookings.map(booking => booking.toJSON()));
        res.download('bookings.csv');

    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message, error: 'Failed to download CSV' });
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
            { header: 'Logged Out Date', key: 'loggedOutDate', width: 15 }
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

