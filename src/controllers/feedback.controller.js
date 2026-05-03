import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import feedbackService from "../services/feedback.service.js";

class FeedbackController {
  constructor(service = feedbackService) {
    this.service = service;
  }

  generateToken = asyncHandler(async (req, res) => {
    const data = await this.service.generateFeedbackToken(
      req.user,
      req.params.id,
      req.body
    );

    res.status(201).json(ApiResponse.success(data, "Feedback token generated", 201));
  });

  submitFeedback = asyncHandler(async (req, res) => {
    const data = await this.service.submitFeedback(req.params.token, req.body);
    res.status(201).json(ApiResponse.success(data, "Feedback submitted", 201));
  });

  getAnalytics = asyncHandler(async (req, res) => {
    const data = await this.service.getAnalytics(req.user, req.query);
    res.status(200).json(ApiResponse.success(data, "Feedback analytics fetched"));
  });
}

const feedbackController = new FeedbackController();
export default feedbackController;
