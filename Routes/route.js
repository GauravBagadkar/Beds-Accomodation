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
router.post('/getAllBookingExcel', Controller.getAllBookingExcel);
router.post('/EXCELdownloadBookingHistory', Controller.EXCELdownloadBookingHistory);

router.post('/search', validation.validate('searching'), Controller.searchName);
router.post('/bookingSearchName', Controller.bookingSearchName);
router.post('/getProfile', Controller.getProfile);
router.post('/cancelBooking', Controller.cancelBooking);

// router.post('/getAvailableBeds', Controller.getAvailableBeds);
// router.post('/getVacantBeds', Controller.getVacantBeds);

router.post('/forgotPassword', Controller.forgotPassword);
router.post('/resetPassword', Controller.resetPassword);

router.post('/getBookingHistory', Controller.getBookingHistory);
router.get('/getEmployeeList', Controller.getEmployeeList);
router.get('/formattedBookingHistory', Controller.formattedBookingHistory);

module.exports = router;