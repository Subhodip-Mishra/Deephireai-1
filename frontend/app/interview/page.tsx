"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Clock, ArrowLeft, UserCircle, Mic, MicOff, PhoneOff, Loader2, Volume2, VolumeX, Info } from "lucide-react";
import { toast, Toaster } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { ModeToggle } from "@/components/ModeToggle";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Window {
  webkitAudioContext?: typeof AudioContext;
}

interface ChatMessage {
  role: "interviewer" | "user";
  content: string;
  timestamp: string;
  audio_url?: string;
}

interface Decision {
  status: string;
  scores: {
    technical_depth: number;
    communication: number;
    problem_solving: number;
    total: number;
  };
  reasons: string;
  improvements: string;
}

interface InterviewSummary {
  decision: Decision | null;
  conversation: ChatMessage[];
}

const getToastStyle = (theme: string) => ({
  background: theme === "dark" ? "#1F2937" : "#FFFFFF",
  border: `1px solid ${theme === "dark" ? "#374151" : "#E5E7EB"}`,
  color: theme === "dark" ? "#D1D5DB" : "#4B5563",
  borderRadius: "12px",
  padding: "16px",
  fontSize: "16px",
  boxShadow: theme === "dark" ? "0 4px 12px rgba(0, 0, 0, 0.3)" : "0 4px 12px rgba(0, 0, 0, 0.1)",
});

const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

async function convertToWav(audioBuffer: AudioBuffer): Promise<Blob> {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length * numChannels * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
  };

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + audioBuffer.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint16(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, audioBuffer.length * 2, true);

  const channelData = audioBuffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < channelData.length; i++, offset += 2) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export default function InterviewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const resumeId = searchParams.get("resumeId") || "";
  const durationParam = searchParams.get("duration") || "300";
  const initialTime = parseInt(durationParam, 10);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [loadingContext, setLoadingContext] = useState<boolean>(false);
  const [question, setQuestion] = useState<string>("");
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [loadingAnswer, setLoadingAnswer] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(initialTime);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isHired, setIsHired] = useState<boolean>(false);
  const [interviewSummary, setInterviewSummary] = useState<InterviewSummary | null>(null);
  const [isTimerExpired, setIsTimerExpired] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    audioRef.current = new Audio();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playAudio = (audioUrl: string) => {
    if (audioRef.current && !isMuted) {
      audioRef.current.src = `${audioUrl}`;
      audioRef.current.play().catch((err) => {
        console.error("Audio playback failed:", err);
        toast.error("Failed to play audio response.", { style: getToastStyle(theme || "dark") });
      });
    }
  };

  useEffect(() => {
    const storedTimer = localStorage.getItem(`interviewTimer_${resumeId}`);
    const storedDecision = localStorage.getItem(`interviewDecision_${resumeId}`);
    if (storedDecision) {
      const parsedDecision = JSON.parse(storedDecision);
      setInterviewSummary({ decision: parsedDecision, conversation: chatLog });
      setIsHired(parsedDecision.status === "hired");
      setIsDialogOpen(true);
      return;
    }

    if (storedTimer) {
      const { startTime, duration } = JSON.parse(storedTimer);
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setIsTimerExpired(true);
        setIsAnalyzing(true);
        handleEndInterview();
      }
    } else {
      localStorage.setItem(
        `interviewTimer_${resumeId}`,
        JSON.stringify({ startTime: Date.now(), duration: initialTime })
      );
      startInterview();
    }
  }, [resumeId, initialTime]);

  const startInterview = async () => {
    setLoadingContext(true);
    try {
      const res = await fetch(`/interview/${resumeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to start interview");
      const initialMessage: ChatMessage = {
        role: "interviewer",
        content: data.initial_message || "Hello! I'm excited to conduct your interview today. Let's begin.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        audio_url: data.audio_url,
      };
      setChatLog([initialMessage]);
      if (data.audio_url) playAudio(data.audio_url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start interview";
      setError(errorMessage);
      toast.error(errorMessage, { style: getToastStyle(theme || "dark") });
    } finally {
      setLoadingContext(false);
    }
  };

  const fetchInterviewSummary = async (retries = 3, delay = 2000): Promise<void> => {
    try {
      const res = await fetch(`/summary/${resumeId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error fetching summary");
      setInterviewSummary({
        decision: data.decision,
        conversation: data.conversation.length > 0 ? data.conversation : chatLog,
      });
      if (data.decision) {
        setIsHired(data.decision.status === "hired");
        localStorage.setItem(`interviewDecision_${resumeId}`, JSON.stringify(data.decision));
        setIsDialogOpen(true);
      } else if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return fetchInterviewSummary(retries - 1, delay * 1.5);
      } else {
        setInterviewSummary({
          decision: {
            status: "not hired",
            scores: { technical_depth: 50, communication: 50, problem_solving: 50, total: 50 },
            reasons: "No decision provided.",
            improvements: "Consider providing more detailed answers.",
          },
          conversation: chatLog,
        });
        setIsHired(false);
        setIsDialogOpen(true);
      }
    } catch (err) {
      setInterviewSummary({
        decision: {
          status: "not hired",
          scores: { technical_depth: 50, communication: 50, problem_solving: 50, total: 50 },
          reasons: "Error fetching summary.",
          improvements: "Ensure to complete the interview.",
        },
        conversation: chatLog,
      });
      setIsHired(false);
      setIsDialogOpen(true);
    }
  };

  useEffect(() => {
    if (isTimerExpired || timeLeft <= 0 || isDialogOpen) {
      if (timeLeft <= 0 && !isDialogOpen && !isAnalyzing && !loadingAnswer) {
        setIsTimerExpired(true);
        setIsAnalyzing(true);
        fetchInterviewSummary().then(() => setIsAnalyzing(false));
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) localStorage.removeItem(`interviewTimer_${resumeId}`);
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isTimerExpired, resumeId, isDialogOpen, isAnalyzing, loadingAnswer]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [chatLog]);

  const handleVoiceInput = async () => {
    if (!resumeId || !isValidUUID(resumeId)) {
      setError("Invalid resume ID.");
      toast.error("Invalid resume ID.", { style: getToastStyle(theme || "dark") });
      return;
    }

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: "audio/webm", audioBitsPerSecond: 128000 });
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => audioChunksRef.current.push(event.data);

        mediaRecorderRef.current.onstop = async () => {
          let audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

          try {
            const AudioContextConstructor = window.AudioContext || window.AudioContext;
            if (!AudioContextConstructor) throw new Error("AudioContext not supported");
            const audioContext = new AudioContextConstructor();
            const arrayBuffer = await audioBlob.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            audioBlob = await convertToWav(audioBuffer);
          } catch (err) {
            setError("Failed to process audio.");
            toast.error("Failed to process audio.", { style: getToastStyle(theme || "dark") });
            stream.getTracks().forEach((track) => track.stop());
            return;
          }

          const formData = new FormData();
          formData.append("file", audioBlob, "recording.wav");
          formData.append("thread_id", resumeId);

          setLoadingAnswer(true);
          setError("");

          // Add user's voice input to chat log (as transcribed by the server)
          try {
            const res = await fetch(`/voice-chat/${resumeId}`, {
              method: "POST",
              body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Error processing voice input");

            // First, add the user's message (transcribed from voice)
            const userMessage: ChatMessage = {
              role: "user",
              content: data.question, // User's transcribed voice input
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };
            setChatLog((prev) => [...prev, userMessage]);

            // Then, add the AI's response
            const interviewerMessage: ChatMessage = {
              role: "interviewer",
              content: data.answer,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              audio_url: data.audio_url,
            };
            setChatLog((prev) => [...prev, interviewerMessage]);

            setQuestion("");
            if (data.audio_url) playAudio(data.audio_url);

            if (data.decision?.status || data.answer.toLowerCase() === "end interview") {
              setInterviewSummary({ decision: data.decision, conversation: [...chatLog, userMessage, interviewerMessage] });
              setIsHired(data.decision?.status === "hired");
              setIsDialogOpen(true);
              localStorage.setItem(`interviewDecision_${resumeId}`, JSON.stringify(data.decision));
              localStorage.removeItem(`interviewTimer_${resumeId}`);
              setIsTimerExpired(true);
            }

            toast.success("Response received!", { style: getToastStyle(theme || "dark") });
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to process response.";
            setError(errorMessage);
            toast.error(errorMessage, { style: getToastStyle(theme || "dark") });
          } finally {
            setLoadingAnswer(false);
          }

          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        toast.info("Recording started...", { style: getToastStyle(theme || "dark") });
      } catch (err) {
        setError("Microphone access denied.");
        toast.error("Microphone access denied.", { style: getToastStyle(theme || "dark") });
      }
    }
  };

  const handleAsk = async (endInterview?: string) => {
    if (!resumeId || !isValidUUID(resumeId)) {
      setError("Invalid resume ID.");
      toast.error("Invalid resume ID.", { style: getToastStyle(theme || "dark") });
      return;
    }

    if (!endInterview && (!question.trim() || timeLeft <= 0 || isTimerExpired)) return;

    setLoadingAnswer(true);
    setError("");

    // First, add the user's message to the chat log
    const userMessage: ChatMessage = {
      role: "user",
      content: endInterview || question,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setChatLog((prev) => [...prev, userMessage]);

    try {
      const res = await fetch(`/chat/${resumeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: endInterview || question, thread_id: resumeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error getting response");

      // Then, add the AI's response
      const interviewerMessage: ChatMessage = {
        role: "interviewer",
        content: data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        audio_url: data.audio_url,
      };
      setChatLog((prev) => [...prev, interviewerMessage]);

      setQuestion("");
      if (data.audio_url) playAudio(data.audio_url);

      if (!endInterview && (data.decision?.status || data.answer.toLowerCase() === "end interview")) {
        setInterviewSummary({ decision: data.decision, conversation: [...chatLog, userMessage, interviewerMessage] });
        setIsHired(data.decision?.status === "hired");
        setIsDialogOpen(true);
        localStorage.setItem(`interviewDecision_${resumeId}`, JSON.stringify(data.decision));
        localStorage.removeItem(`interviewTimer_${resumeId}`);
        setIsTimerExpired(true);
      }

      toast.success("Response received!", { style: getToastStyle(theme || "dark") });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to process response.";
      setError(errorMessage);
      toast.error(errorMessage, { style: getToastStyle(theme || "dark") });
    } finally {
      setLoadingAnswer(false);
    }
  };

  const handleEndInterview = async () => {
    if (localStorage.getItem(`interviewDecision_${resumeId}`)) {
      router.push("/resume");
      return;
    }

    setLoadingAnswer(true);
    setIsTimerExpired(true);
    setIsAnalyzing(true);

    try {
      const res = await fetch(`/chat/${resumeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "end interview", thread_id: resumeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error ending interview");

      const finalDecision = data.decision || {
        status: "not hired",
        scores: { technical_depth: 50, communication: 50, problem_solving: 50, total: 50 },
        reasons: "No decision provided.",
        improvements: "Provide more detailed answers.",
      };

      localStorage.setItem(`interviewDecision_${resumeId}`, JSON.stringify(finalDecision));
      localStorage.removeItem(`interviewTimer_${resumeId}`);
      setInterviewSummary({ decision: finalDecision, conversation: chatLog });
      setIsHired(finalDecision.status === "hired");
      setIsDialogOpen(true);
    } catch (err) {
      localStorage.setItem(
        `interviewDecision_${resumeId}`,
        JSON.stringify({
          status: "not hired",
          scores: { technical_depth: 50, communication: 50, problem_solving: 50, total: 50 },
          reasons: "Error ending interview.",
          improvements: "Complete the interview with detailed responses.",
        })
      );
      router.push("/resume");
    } finally {
      setLoadingAnswer(false);
      setIsAnalyzing(false);
    }
  };

  const handleResetInterview = () => {
    localStorage.removeItem(`interviewTimer_${resumeId}`);
    localStorage.removeItem(`interviewDecision_${resumeId}`);
    setChatLog([]);
    setTimeLeft(initialTime);
    setIsDialogOpen(false);
    setIsHired(false);
    setInterviewSummary(null);
    setLoadingAnswer(false);
    setQuestion("");
    setError("");
    setIsTimerExpired(false);
    setIsAnalyzing(false);
    localStorage.setItem(`interviewTimer_${resumeId}`, JSON.stringify({ startTime: Date.now(), duration: initialTime }));
    startInterview();
  };

  const handleBackToUpload = () => {
    router.push("/resume");
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      if (audioRef.current) {
        if (prev) {
          audioRef.current.play().catch((err) => console.error("Audio playback failed:", err));
        } else {
          audioRef.current.pause();
        }
      }
      return !prev;
    });
  };

  if (!mounted) return null;

  if (!resumeId || !isValidUUID(resumeId)) {
    return (
      <main className={cn("min-h-screen flex flex-col items-center justify-center p-6", theme === "dark" ? "bg-gray-900" : "bg-gray-50")}>
        <Card className={cn("w-full max-w-md shadow-xl rounded-2xl", theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200")}>
          <CardContent className="p-8 text-center">
            <p className={cn("text-lg font-semibold", theme === "dark" ? "text-red-400" : "text-red-600")}>
              Invalid or missing resume ID.
            </p>
            <Button
              onClick={handleBackToUpload}
              className={cn("mt-6 w-full rounded-lg py-3 font-semibold", theme === "dark" ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white")}
              aria-label="Go to upload"
            >
              Go to Upload
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className={cn("min-h-screen flex flex-col p-4 sm:p-6", theme === "dark" ? "bg-gray-900" : "bg-gray-50")}>
      <Toaster position="top-center" expand={true} richColors closeButton />
      <div className="w-full max-w-7xl mx-auto flex flex-row h-[calc(100vh-2rem)] sm:h-[calc(100vh-3rem)] gap-4">
        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Status Bar */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className={cn("flex justify-between items-center p-4 rounded-2xl shadow-md", theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200", "border")}
          >
            <div className="flex items-center gap-3">
              <Button
                onClick={handleBackToUpload}
                variant="ghost"
                className={cn("text-sm font-medium", theme === "dark" ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900")}
                aria-label="Back to upload"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back
              </Button>
              <span className={cn("text-sm font-semibold", theme === "dark" ? "text-gray-200" : "text-gray-700")}>
                Interview | Connected
              </span>
            </div>
            <div className="flex items-center gap-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={toggleMute}
                      variant="ghost"
                      className={cn("p-2", theme === "dark" ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900")}
                      aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="w-12 h-12">
                <CircularProgressbar
                  value={(timeLeft / initialTime) * 100}
                  text={formatTime(timeLeft)}
                  styles={buildStyles({
                    textSize: "24px",
                    pathColor: theme === "dark" ? "#60A5FA" : "#2563EB",
                    textColor: theme === "dark" ? "#E5E7EB" : "#1F2937",
                    trailColor: theme === "dark" ? "#4B5563" : "#D1D5DB",
                  })}
                />
              </div>
              <ModeToggle />
            </div>
          </motion.div>

          {/* Video Feed and Chat */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Video Feed */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className={cn("lg:col-span-2 flex flex-col rounded-2xl shadow-xl", theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200", "border")}
            >
              <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                <motion.div
                  animate={{ scale: loadingAnswer || isAnalyzing ? [1, 1.02, 1] : 1 }}
                  transition={{ duration: 1, repeat: loadingAnswer || isAnalyzing ? Infinity : 0 }}
                  className="text-center"
                >
                  <div className={cn("p-10 rounded-full shadow-2xl", theme === "dark" ? "bg-blue-600/10" : "bg-blue-100/20")}>
                    <UserCircle className={cn("h-36 w-36", theme === "dark" ? "text-blue-400" : "text-blue-600")} />
                  </div>
                  <p className={cn("mt-4 text-xl font-bold", theme === "dark" ? "text-gray-100" : "text-gray-800")}>
                    AI Interviewer
                  </p>
                  <p className={cn("text-sm mt-2", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                    {loadingContext ? "Preparing..." : isAnalyzing ? "Analyzing..." : loadingAnswer ? "Processing..." : "Awaiting response..."}
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                  className={cn("absolute bottom-4 right-4 w-28 h-20 rounded-lg shadow-md", theme === "dark" ? "bg-gray-800/90" : "bg-gray-200/90", "flex items-center justify-center")}
                >
                  <UserCircle className={cn("h-14 w-14", theme === "dark" ? "text-gray-400" : "text-gray-500")} />
                  <span className={cn("absolute bottom-2 left-2 text-xs font-medium", theme === "dark" ? "text-gray-300" : "text-gray-600")}>
                    You
                  </span>
                </motion.div>
              </div>
            </motion.div>

            {/* Chat Container */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className={cn("flex flex-col rounded-2xl shadow-xl", theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200", "border")}
            >
              <div className={cn("p-4 border-b", theme === "dark" ? "border-gray-700" : "border-gray-200")}>
                <h2 className={cn("text-lg font-bold", theme === "dark" ? "text-gray-100" : "text-gray-800")}>
                  Conversation
                </h2>
              </div>
              <div
                className={cn("flex-1 overflow-y-auto p-4 space-y-4", "min-h-0")}
                style={{ maxHeight: "calc(100vh - 300px)" }}
                ref={chatContainerRef}
                role="log"
                aria-live="polite"
              >
                {loadingContext ? (
                  <div className="flex justify-center items-center">
                    <Loader2 className={cn("h-6 w-6 animate-spin mr-2", theme === "dark" ? "text-blue-400" : "text-blue-600")} />
                    <p className={cn("text-sm font-medium", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                      Connecting...
                    </p>
                  </div>
                ) : error ? (
                  <p className={cn("text-center text-sm font-semibold", theme === "dark" ? "text-red-400" : "text-red-600")}>
                    Error: {error}
                  </p>
                ) : isAnalyzing ? (
                  <div className="flex justify-center items-center">
                    <Loader2 className={cn("h-6 w-6 animate-spin mr-2", theme === "dark" ? "text-blue-400" : "text-blue-600")} />
                    <p className={cn("text-sm font-medium", theme === "dark" ? "text-gray-200" : "text-gray-700")}>
                      Analyzing...
                    </p>
                  </div>
                ) : chatLog.length === 0 ? (
                  <p className={cn("text-center text-sm font-medium", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                    No conversation yet.
                  </p>
                ) : (
                  chatLog.map((chat, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={cn("flex", chat.role === "user" ? "justify-end" : "justify-start")}
                    >
                      <div className="flex items-start gap-2 max-w-[80%]">
                        {chat.role === "interviewer" && (
                          <UserCircle className={cn("h-8 w-8", theme === "dark" ? "text-blue-400" : "text-blue-600")} />
                        )}
                        <div
                          className={cn(
                            "p-4 rounded-xl text-sm shadow-sm",
                            chat.role === "user"
                              ? theme === "dark"
                                ? "bg-gray-700/80 text-white"
                                : "bg-gray-200/80 text-gray-900"
                              : theme === "dark"
                                ? "bg-blue-700/80 text-white"
                                : "bg-blue-100/80 text-blue-900"
                          )}
                        >
                          <p className="font-semibold">{chat.role === "user" ? "You" : "Interviewer"}</p>
                          <p className="mt-1">{chat.content}</p>
                          <p className="text-xs opacity-70 mt-2">{chat.timestamp}</p>
                        </div>
                        {chat.role === "user" && (
                          <UserCircle className={cn("h-8 w-8", theme === "dark" ? "text-gray-400" : "text-gray-500")} />
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
              <div className={cn("p-4 border-t", theme === "dark" ? "border-gray-700" : "border-gray-200")}>
                <div className="flex items-center gap-2">
                  <Input
                    id="questionInput"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAsk();
                      }
                    }}
                    disabled={loadingAnswer || timeLeft <= 0 || isTimerExpired || isAnalyzing}
                    className={cn(
                      "flex-1 rounded-lg py-3 text-sm shadow-sm",
                      theme === "dark" ? "bg-gray-800 text-gray-100 border-gray-600 focus:ring-blue-400 placeholder-gray-400" : "bg-white text-gray-900 border-gray-200 focus:ring-blue-500 placeholder-gray-500",
                      "focus:ring-2"
                    )}
                    placeholder="Type your response..."
                    aria-label="Type your response"
                  />
                  <Button
                    onClick={() => handleAsk()}
                    disabled={loadingAnswer || timeLeft <= 0 || isTimerExpired || isAnalyzing || !question.trim()}
                    className={cn("rounded-lg px-4 py-2", theme === "dark" ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white")}
                    aria-label="Submit response"
                  >
                    Send
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Sidebar with Controls */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className={cn("w-16 flex flex-col items-center gap-4 p-4 rounded-2xl shadow-md", theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200", "border")}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleVoiceInput}
                  disabled={loadingContext || loadingAnswer || timeLeft <= 0 || isTimerExpired || isAnalyzing}
                  className={cn(
                    "p-3 rounded-full",
                    isRecording ? theme === "dark" ? "bg-red-600 hover:bg-red-500" : "bg-red-500 hover:bg-red-600" : theme === "dark" ? "bg-green-600 hover:bg-green-500" : "bg-green-500 hover:bg-green-600",
                    "text-white",
                    isRecording && "animate-pulse"
                  )}
                  aria-label={isRecording ? "Stop recording" : "Start recording"}
                >
                  {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isRecording ? "Stop recording" : "Start recording"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleEndInterview}
                  disabled={loadingAnswer || isTimerExpired || isAnalyzing || !!localStorage.getItem(`interviewDecision_${resumeId}`)}
                  className={cn("p-3 rounded-full", theme === "dark" ? "bg-red-600 hover:bg-red-500 text-white" : "bg-red-500 hover:bg-red-600 text-white")}
                  aria-label="End interview"
                >
                  <PhoneOff className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>End interview</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </motion.div>
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !isAnalyzing && setIsDialogOpen(open)}>
        <DialogContent className={cn("rounded-2xl max-w-lg max-h-[80vh] overflow-y-auto p-6", theme === "dark" ? "bg-gray-900 border-gray-700 text-gray-100" : "bg-white border-gray-200 text-gray-900")}>
          <DialogHeader>
            <DialogTitle
              className={cn(
                "text-xl font-bold",
                isAnalyzing ? theme === "dark" ? "text-gray-100" : "text-gray-800" : isHired ? theme === "dark" ? "text-green-400" : "text-green-600" : theme === "dark" ? "text-red-400" : "text-red-600"
              )}
            >
              {isAnalyzing ? "Analyzing Interview" : isHired ? "You're Hired!" : "Interview Outcome"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className={cn("h-10 w-10 animate-spin mb-4", theme === "dark" ? "text-blue-400" : "text-blue-600")} />
                <p className={cn("text-base font-medium", theme === "dark" ? "text-gray-200" : "text-gray-700")}>
                  Analyzing performance...
                </p>
              </div>
            ) : interviewSummary ? (
              <div className={cn("rounded-xl p-5 shadow-md", theme === "dark" ? "bg-gray-800 border-gray-600" : "bg-gray-50 border-gray-200", "border")}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Info className={cn("h-5 w-5", isHired ? "text-green-500" : "text-blue-500")} />
                  Hiring Decision
                </h3>
                <div className="space-y-4">
                  <p className="text-base font-semibold">
                    Status: <span className={cn(isHired ? "text-green-500" : "text-red-500", "font-bold")}>{isHired ? "Hired" : "Not Hired"}</span>
                  </p>
                  <p className={cn("text-sm leading-relaxed", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                    {isHired ? "We are thrilled to welcome you to the team!" : "Thank you for interviewing. We will not be moving forward at this time."}
                  </p>

                  {interviewSummary.decision?.improvements && (
                    <div className={cn("text-sm leading-relaxed", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                      <span className={cn("font-semibold", theme === "dark" ? "text-gray-100" : "text-gray-900")}>Areas for Improvement:</span> {interviewSummary.decision.improvements}
                    </div>
                  )}

                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <p className={cn("text-base font-medium", theme === "dark" ? "text-gray-200" : "text-gray-700")}>
                  Interview Completed
                </p>
                <p className={cn("text-sm mt-2", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                  Thank you for participating.
                </p>
              </div>
            )}
          </div>
          {!isAnalyzing && (
            <DialogFooter className="flex flex-col sm:flex-row justify-end gap-3">
              <Button
                onClick={handleBackToUpload}
                variant="outline"
                className={cn("rounded-lg px-6 py-2.5 w-full sm:w-auto", theme === "dark" ? "bg-gray-700 hover:bg-gray-600 text-gray-100 border-gray-600" : "bg-white hover:bg-gray-100 text-gray-900 border-gray-300")}
                aria-label="Back to upload"
              >
                Back to Upload
              </Button>
              <Button
                onClick={handleResetInterview}
                className={cn("rounded-lg px-6 py-2.5 w-full sm:w-auto", theme === "dark" ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white")}
                aria-label="Start new interview"
              >
                Start New Interview
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
