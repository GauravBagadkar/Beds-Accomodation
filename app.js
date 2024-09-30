const express = require('express');
const app = express();
const port = process.env.PORT || 4000;

const dbConfig = require('./Config/dbConfig');
dbConfig.sequelize.sync({ force: false });

app.use(express.json());

const routes = require('./Routes/route');
app.use('/', routes);

app.use((err, req, res, next) => {
    console.log(err.message);
    res.status(400).json({ error: "Something broke!" });
});

app.listen(port, () => {
    console.log(`server has started, ${port}`);
});