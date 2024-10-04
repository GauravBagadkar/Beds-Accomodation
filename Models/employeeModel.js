module.exports = (sequelize, Sequelize) => {
    const employee = sequelize.define('tbl_employees', {
        id: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: Sequelize.STRING
        },
        email: {
            type: Sequelize.STRING
        },
        contact: {
            type: Sequelize.BIGINT
        },
        gender: {
            type: Sequelize.STRING
        },
        dob: {
            type: Sequelize.DATEONLY
        },
        address: {
            type: Sequelize.STRING
        },
        deptName: {
            type: Sequelize.STRING
        },
        roleName: {
            type: Sequelize.STRING
        },
        password: {
            type: Sequelize.STRING
        },
        // resetToken: {
        //     type: Sequelize.STRING
        // },
        // resetTokenExpires: {
        //     type: Sequelize.STRING
        // }
    })
    return employee;
}