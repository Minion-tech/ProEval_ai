import { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export const useInterviewMonitoring = (isActive: boolean) => {
  const webcamRef = useRef<Webcam>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState({
    lookAwayCount: 0,
    totalChecks: 0,
  });

  useEffect(() => {
    async function initMediaPipe() {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
        });
        faceLandmarkerRef.current = landmarker;
        setIsLoading(false);
      } catch (err) {
        setError("Failed to initialize video analytics.");
        setIsLoading(false);
      }
    }
    initMediaPipe();
  }, []);

  const runMonitoring = useCallback(() => {
    if (
      !isActive ||
      !webcamRef.current ||
      !webcamRef.current.video ||
      webcamRef.current.video.readyState !== 4 ||
      !faceLandmarkerRef.current
    ) {
      return;
    }

    const video = webcamRef.current.video;
    const startTimeMs = performance.now();
    const results = faceLandmarkerRef.current.detectForVideo(video, startTimeMs);

    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
      const landmarks = results.faceLandmarks[0];
      const leftIris = landmarks[468];
      const isLookingAway = leftIris.x < 0.4 || leftIris.x > 0.6;

      setTelemetry(prev => ({
        ...prev,
        totalChecks: prev.totalChecks + 1,
        lookAwayCount: prev.lookAwayCount + (isLookingAway ? 1 : 0),
      }));
    }
  }, [isActive]);

  useEffect(() => {
    if (isActive) {
      const interval = setInterval(runMonitoring, 1000);
      return () => clearInterval(interval);
    }
  }, [isActive, runMonitoring]);

  return { webcamRef, isLoading, error, telemetry };
};
