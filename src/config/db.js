import mongoose from 'mongoose';
import logger from '../loggers/winston.logger.js'
import config from './config.js'

class DatabaseConnection {
    async connect() {
        const dbUrl = config.DB_URL;
        await mongoose.connect(dbUrl);
        logger.info('Connected to MongoDB');
    }
}

const databaseConnection = new DatabaseConnection();
const connectedToDatabase = () => databaseConnection.connect();

export default connectedToDatabase;