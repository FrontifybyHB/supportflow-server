class ApiResponse {
  static success(data, message = "Success", statusCode = 200) {
    return {
      success: true,
      statusCode,
      message,
      data,
    };
  }

  static error(message = "Internal Server Error", statusCode = 500) {
    return {
      success: false,
      statusCode,
      message,
    };
  }
}

export default ApiResponse;
