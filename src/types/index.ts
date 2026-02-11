// Core data structures matching Rust equivalents

export interface SeedPos {
  xy: [number, number]; // [x, y] coordinates
}

export interface SeedColor {
  rgba: [number, number, number, number]; // [r, g, b, a] normalized 0-1
}

export interface CellBody {
  srcx: number;
  srcy: number;
  dstx: number;
  dsty: number;
  velx: number;
  vely: number;
  accx: number;
  accy: number;
  dstForce: number;
  age: number;
  strokeId: number;
}

export interface Preset {
  inner: UnprocessedPreset;
  assignments: number[]; // Array mapping source index → target index
}

export interface UnprocessedPreset {
  name: string;
  width: number;
  height: number;
  sourceImg: Uint8Array; // RGB pixel data
}

export enum Algorithm {
  Optimal = 'optimal',
  Genetic = 'genetic',
}

export enum ProgressMsgType {
  Progress = 'progress',
  UpdatePreview = 'update_preview',
  UpdateAssignments = 'update_assignments',
  Done = 'done',
  Error = 'error',
  Cancelled = 'cancelled',
}

export interface ProgressMsgProgress {
  type: ProgressMsgType.Progress;
  value: number;
}

export interface ProgressMsgUpdatePreview {
  type: ProgressMsgType.UpdatePreview;
  width: number;
  height: number;
  data: number[];
}

export interface ProgressMsgUpdateAssignments {
  type: ProgressMsgType.UpdateAssignments;
  assignments: number[];
}

export interface ProgressMsgDone {
  type: ProgressMsgType.Done;
  preset: Preset;
}

export interface ProgressMsgError {
  type: ProgressMsgType.Error;
  message: string;
}

export interface ProgressMsgCancelled {
  type: ProgressMsgType.Cancelled;
}

export type ProgressMsg =
  | ProgressMsgProgress
  | ProgressMsgUpdatePreview
  | ProgressMsgUpdateAssignments
  | ProgressMsgDone
  | ProgressMsgError
  | ProgressMsgCancelled;

export interface GenerationSettings {
  id: string;
  name: string;
  proximityImportance: number; // Spatial vs color weighting
  algorithm: Algorithm;
  sidelen: number; // Square dimension (resolution)
  customTarget?: UnprocessedPreset;
  targetCropScale: CropScale;
  sourceCropScale: CropScale;
}

export interface CropScale {
  scale: number; // Zoom level (>= 1)
  x: number; // X offset (-1 to 1)
  y: number; // Y offset (-1 to 1)
}

export interface PixelData {
  strokeId: number;
  lastEdited: number;
}

export interface GuiState {
  presets: Preset[];
  currentPreset: number;
  animate: boolean;
  reverse: boolean;
  mode: 'transform' | 'draw';
  drawingColor: [number, number, number, number]; // RGBA
  lastMousePos?: [number, number];
  showConfig: boolean;
  showProgress: boolean;
  progress: number;
  errorMessage?: string;
}

export const DRAWING_COLORS: [number, number, number, number][] = [
  [1, 0, 0, 0.5], // Red
  [0, 1, 0, 0.5], // Green
  [0, 0, 1, 0.5], // Blue
  [1, 1, 0, 0.5], // Yellow
  [0, 0, 0, 0.5], // Black/Eraser
];

export const DEFAULT_RESOLUTION = 256; // Good balance of performance & quality
export const DRAWING_CANVAS_SIZE = 128;
export const SWAPS_PER_GENERATION_PER_PIXEL = 128;
