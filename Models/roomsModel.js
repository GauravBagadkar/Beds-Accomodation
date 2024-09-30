module.exports = (sequelize, Sequelize) => {
    const rooms = sequelize.define('tbl_rooms', {
        id: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        roomNumber: {
            type: Sequelize.INTEGER
        }
    })
    return rooms;
}