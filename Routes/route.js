const express = require('express');
const router = express.Router();

const validation = require('../Middleware/validation');
const Controller = require('../Controller/controller');

router.post('/empLogin', Controller.empLogin);
router.post('/bookingBeds', Controller.bookingBeds);
router.post('/bedAddApi', Controller.bedAddApi);
router.post('/roomAddApi', Controller.roomAddApi);
router.post('/addEmployee', Controller.addEmployee);
router.post('/checkBeds', Controller.checkBeds);
router.post('/viewExtendBooking', Controller.viewExtendBooking);
router.post('/bookToVacantBed', Controller.bookToVacantBed);
router.post('/getBookingsByMonth', Controller.getBookingsByMonth);
router.post('/EXCELdownloadBookingHistory', Controller.EXCELdownloadBookingHistory);

router.post('/search', validation.validate('searching'), Controller.searchName);
router.post('/bookingSearchName', Controller.bookingSearchName);

router.get('/getBookingHistory', Controller.getBookingHistory);
router.get('/getEmployeeList', Controller.getEmployeeList);
router.get('/formattedBookingHistory', Controller.formattedBookingHistory);
router.get('/CSVdownloadBookingHistory', Controller.CSVdownloadBookingHistory);

module.exports = router;