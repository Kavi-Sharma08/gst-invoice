import { asyncHandler } from '../../shared/http/async-handler.js';
import * as businessService from './business.service.js';

export const getProfile = asyncHandler(async (req, res) => {
  const profile = await businessService.getBusinessProfile(req.user.id);
  res.status(200).json({
    success: true,
    data: profile
  });
});

export const saveProfile = asyncHandler(async (req, res) => {
  const profile = await businessService.saveBusinessProfile(req.user.id, req.body);
  res.status(200).json({
    success: true,
    data: profile
  });
});
