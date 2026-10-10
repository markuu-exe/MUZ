declare module '@mediapipe/tasks-vision' {
  export class FilesetResolver {
    static forVisionTasks(path: string): Promise<any>;
  }

  export class PoseLandmarker {
    static createFromOptions(vision: any, options: any): Promise<any>;
    detectForVideo(frame: any, timestamp: number): any;
    close(): void;
  }
}

declare module 'lucide-react';
