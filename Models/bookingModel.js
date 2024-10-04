module.exports = (sequelize, Sequelize) => {
    const bookings = sequelize.define('tbl_bookings', {
        id: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        empId: {
            type: Sequelize.BIGINT
        },
        name: {
            type: Sequelize.STRING
        },
        email: {
            type: Sequelize.STRING
        },
        deptName: {
            type: Sequelize.STRING
        },
        roomNumber: {
            type: Sequelize.INTEGER
        },
        bedNumber: {
            type: Sequelize.INTEGER
        },
        bedId: {
            type: Sequelize.INTEGER
        },
        bedStatus: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,  // False = Vacant, True = Booked
        },
        loggedInDate: {
            type: Sequelize.DATEONLY
        },
        loggedOutDate: {
            type: Sequelize.DATEONLY
        }
    })
    return bookings;
}