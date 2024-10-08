module.exports = (sequelize, Sequelize) => {
    const beds = sequelize.define('tbl_beds', {
        id: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        bedNumber: {
            type: Sequelize.INTEGER,

        },
        roomId: {
            type: Sequelize.BIGINT
        }
    })
    return beds;
}