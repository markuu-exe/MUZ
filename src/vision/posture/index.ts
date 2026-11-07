export { PostureAnalyzer } from './PostureAnalyzer';
export { PostureSession } from './session';
export type { AngleSummary, PostureSessionSummary } from './session';
export { DEFAULT_POSTURE_CONFIG, resolvePostureConfig } from './config';
export { DEFAULT_CALIBRATION } from './calibration';
export type { CalibrationOptions } from './calibration';
export { classifyBand, cueText } from './rules';
export {
  ARM,
  LM,
  POSE_LANDMARK_COUNT,
  TRACKED_LANDMARKS,
  createPoseFrame,
  extractPoseFrame,
  isUsable,
} from './landmarks';
export type { GateConfig, PoseFrame, PoseResultLike } from './landmarks';
export { HUD_STRIDE } from './workerProtocol';
export type { HudPoints, PostureWorkerRequest, PostureWorkerResponse } from './workerProtocol';
export * as vec3 from './math/vec3';
export type {
  ArmReading,
  ArmStatus,
  BandThreshold,
  CalibrationState,
  CalibrationStatus,
  GatingConfig,
  HandPoint,
  MetricReading,
  MetricState,
  PostureConfig,
  PostureConfigInput,
  PostureCue,
  PostureCueCode,
  PostureSnapshot,
  PostureThresholds,
  Side,
  TrunkReading,
} from './types';
