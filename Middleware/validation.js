const { check, body } = require('express-validator');

exports.validate = (method) => {
    switch (method) {
        case 'searching': {
            return [
                check('name').optional().isLength({ min: 2 }).withMessage('Name must be at least 2 character long'),
                //check('name', "Enter at least one character").isLength({ min: 1 }),
                check('deptName').optional().isLength({ min: 2 }).withMessage('Department name must be at least 2 characters long')
            ]
        }
    }
}