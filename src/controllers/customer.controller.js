import customerService from "../services/customer.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import { success } from "../utils/response.js";

class CustomerController {
    constructor(service = customerService) {
        this.customerService = service;
    }

    identify = asyncHandler(async (req, res) => {
        const result = await this.customerService.identify(req.body);
        return success(res, result, 201);
    });
}

const customerController = new CustomerController();
export default customerController;
