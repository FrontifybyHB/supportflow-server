export const success = (res, data, statusCode = 200, message = "Success") => {
    return res.status(statusCode).json({
        success: true,
        statusCode,
        message,
        data,
    });
};
