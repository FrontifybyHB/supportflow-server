import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import businessAIService from "../services/businessAi.service.js";

class BusinessAIController {
  constructor(service = businessAIService) {
    this.service = service;
  }

  listModels = asyncHandler(async (_req, res) => {
    const data = await this.service.listAvailableModels();
    res.status(200).json(ApiResponse.success(data, "AI models fetched"));
  });

  getSelection = asyncHandler(async (req, res) => {
    const data = await this.service.getSelection(req.businessId);
    res.status(200).json(ApiResponse.success(data, "Business AI model fetched"));
  });

  selectModel = asyncHandler(async (req, res) => {
    const data = await this.service.selectModel(req.businessId, req.body.modelId);
    res.status(200).json(ApiResponse.success(data, "Business AI model selected"));
  });
}

const businessAIController = new BusinessAIController();
export default businessAIController;
