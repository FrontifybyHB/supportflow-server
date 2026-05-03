import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser'
import { generalRateLimiter } from './middlewares/rateLimiter.middleware.js'
import morganLogger from './loggers/morgan.logger.js'
import config from './config/config.js'
import { buildCorsMiddleware } from './config/cors.config.js';
import tenantMiddleware from './middlewares/tenant.middleware.js';

const app = express();

app.set('trust proxy', config.TRUST_PROXY);

app.use(
    buildCorsMiddleware());
app.use(morganLogger);
app.use(helmet());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

app.use((req, _res, next) => {
    const queryStart = req.url.indexOf("?");
    const path = queryStart === -1 ? req.url : req.url.slice(0, queryStart);
    const query = queryStart === -1 ? "" : req.url.slice(queryStart);
    const normalizedPath = path.replace(/\/{2,}/g, "/");
    req.url = `${normalizedPath}${query}`;
    next();
});

app.use(generalRateLimiter)

// import routes
import authRoutes from "./routes/auth.routes.js";
import superadminRoutes from "./routes/superadmin.routes.js";
import agentRoutes from "./routes/agent.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import businessAIRoutes from "./routes/businessAi.routes.js";
import feedbackRoutes from "./routes/feedback.routes.js";
import businessRoutes from "./routes/business.routes.js";
import businessController from "./controllers/business.controller.js";
import customerRoutes from "./routes/customer.routes.js";
import errorHandler from './middlewares/error.handler.js'

// Auth Routes
app.use('/api/v1/auth', authRoutes)
app.use(tenantMiddleware);
app.use('/api/chat', chatRoutes);
app.use('/api/business-ai', businessAIRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/v1/business', businessRoutes)
app.get('/api/v1/businesses/public', businessController.listPublicBusinesses)
app.use('/api/v1/agents', agentRoutes)
app.use('/api/v1/customer', customerRoutes)
app.use('/api/v1/superadmin', superadminRoutes)



// // Simple route for checking server status
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Welcome to the Support Flow AI',
        environment: config.NODE_ENV,
        documentation: 'Welcome to the Support Flow AI',
    });
});

// // 404 route handler for undefined routes
app.all('*name', (req, res, next) => {
    const err = new Error(`Can't find ${req.originalUrl} on this server!`);
    err.statusCode = 404;
    err.status = 'fail';
    next(err);
});

app.use(errorHandler)



export default app;
