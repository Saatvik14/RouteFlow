const app = require('./app');

const { PORT, PROJECT_NAME } = require('./config/env');

app.listen(PORT, () => {
    console.log(`${PROJECT_NAME} Backend Running On Port ${PORT}`);
});