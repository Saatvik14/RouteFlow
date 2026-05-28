const express = require('express');
const cors = require('cors');

const { PROJECT_NAME } = require('./config/env');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send(`${PROJECT_NAME} Backend Running`);
});

module.exports = app;