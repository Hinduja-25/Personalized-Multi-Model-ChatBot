import { getModelList, getDefaultModelKey } from "../config/modelRegistry.js";

/**
 * @desc    Get all enabled models and default model
 * @route   GET /models
 * @access  Public
 */
export const getModels = async (req, res, next) => {
    try {
        const models = getModelList();
        const defaultModel = getDefaultModelKey();

        return res.status(200).json({
            success: true,
            defaultModel,
            models
        });
    } catch (error) {
        next(error);
    }
};
