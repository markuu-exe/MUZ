/**
 * COURSE-5: the webcam picture with the posture HUD on top (SDD 6.3 "Webcam feed
 * panel, HTML5 Canvas Posture HUD"). The <video> element belongs to the rig; this
 * component only places it on screen.
 */
import { useEffect, useRef } from 'react';
import type { PracticeRig, RigState } from '../../../practice/PracticeRig';
import { PostureHud } from '../../practice/PostureHud';

interface CameraPanelProps {
  rig: PracticeRig;
  state: RigState;
}

export default function CameraPanel({ rig, state }: CameraPanelProps) {
  const mount = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    host.appendChild(rig.video);
    // Moving a <video> in the DOM pauses it in some browsers.
    if (rig.video.srcObject && rig.video.paused) void rig.video.play().catch(() => undefined);
    return () => {
      if (rig.video.parentElement === host) host.removeChild(rig.video);
    };
  }, [rig]);

  const live = state.camera.status === 'active';
  let overlay: string | null = null;
  if (state.camera.status === 'idle') overlay = 'Camera is off';
  else if (state.camera.status === 'requesting') overlay = 'Waiting for camera permission…';
  else if (state.camera.status === 'paused') overlay = 'Camera paused';
  else if (state.camera.status === 'error') overlay = 'Camera unavailable';
  else if (state.model === 'loading') overlay = 'Loading the posture model…';
  else if (state.model === 'error') overlay = 'Posture model unavailable';

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl border border-violet-500/30 bg-black shadow-[0_0_30px_rgba(139,92,246,0.2)]">
      <div ref={mount} className="absolute inset-0" />
      <PostureHud video={rig.video} source={rig.frameLoop} fit="cover" mirrored running={live && state.model === 'ready'} />
      {overlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 text-sm font-semibold text-slate-300">
          {overlay}
        </div>
      )}
    </div>
  );
}
