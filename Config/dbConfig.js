require('dotenv').config();
const pg = require('pg');
const Sequelize = require('sequelize').Sequelize;

// const sequelize = new Sequelize('BedsAccomodation', 'postgres', 'HsmOnline', {
//     host: 'localhost',
//     dialect: 'postgres',
//     port: '5432',
//     logging: false,

//     pool: {
//         max: 9,
//         min: 0,
//         idle: 10000
//     }
// });

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectModule: pg,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    logging: true
});



const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// requiring models
db.employee = require('../Models/employeeModel')(sequelize, Sequelize);
db.rooms = require('../Models/roomsModel')(sequelize, Sequelize);
db.beds = require('../Models/bedsModel')(sequelize, Sequelize);
db.booking = require('../Models/bookingModel')(sequelize, Sequelize);

// connecting models
db.booking.belongsTo(db.beds, { foreignKey: 'bedId', as: 'tbl_beds' });
db.beds.belongsTo(db.rooms, { foreignKey: 'roomId', as: 'tbl_rooms' });
db.booking.belongsTo(db.employee, { foreignKey: 'empId', as: 'tbl_employees' })
db.rooms.hasMany(db.beds, { foreignKey: 'roomId', as: 'tbl_beds' });
db.employee.hasMany(db.booking, { foreignKey: 'empId' });

module.exports = db;