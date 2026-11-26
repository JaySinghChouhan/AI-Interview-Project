export function errorHandler(error, _request, response, _next) {
  const status = error.status || error.statusCode || 500;
  const message = status === 500 ? 'Internal server error' : error.message;

  if (status === 500) {
    console.error(error);
  }

  response.status(status).json({
    success: false,
    message,
  });
}
