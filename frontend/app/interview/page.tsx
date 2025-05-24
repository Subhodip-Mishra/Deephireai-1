"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Clock, ArrowLeft, UserCircle, Mic, MicOff, PhoneOff, Loader2, ChevronRight, ChevronLeft, Volume2, VolumeX, Info } from "lucide-react";
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

// Extend Window interface for AudioContext
interface Window {
  webkitAudioContext?: typeof AudioContext;
}

interface ChatMessage {
  question: string;
  answer: string;
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
}

interface InterviewSummary {
  decision: Decision | null;
  conversation: ChatMessage[];
}

// Toast styling constant
const getToastStyle = (theme: string) => ({
  background: theme === "dark" ? "#1F2937" : "#FFFFFF",
  border: `1px solid ${theme === "dark" ? "#374151" : "#E5E7EB"}`,
  color: theme === "dark" ? "#D1D5DB" : "#4B5563",
  borderRadius: "8px",
  padding: "12px",
  fontSize: "14px",
});

// UUID validation function
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Convert AudioBuffer to WAV
async function convertToWav(audioBuffer: AudioBuffer): Promise<Blob> {
  const numChannels: number = audioBuffer.numberOfChannels;
  const sampleRate: number = audioBuffer.sampleRate;
  const length: number = audioBuffer.length * numChannels * 2 + 44;
  const buffer: ArrayBuffer = new ArrayBuffer(length);
  const view: DataView = new DataView(buffer);

  const writeString = (view: DataView, offset: number, string: string): void => {
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

  const channelData: Float32Array = audioBuffer.getChannelData(0);
  let offset: number = 44;
  for (let i = 0; i < channelData.length; i++, offset += 2) {
    const sample: number = Math.max(-1, Math.min(1, channelData[i]));
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
  const [isChatOpen, setIsChatOpen] = useState<boolean>(true);
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

  // Play audio response
  const playAudio = (audioUrl: string) => {
    if (audioRef.current && !isMuted) {
      audioRef.current.src = `http://localhost:8000${audioUrl}`;
      audioRef.current.play().catch((err) => {
        console.error("Audio playback failed:", err);
        toast.error("Failed to play audio response.", { style: getToastStyle(theme!) });
      });
    }
  };

  // Validate resumeId and initialize timer
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
        handleEndCall();
      }
    } else {
      localStorage.setItem(
        `interviewTimer_${resumeId}`,
        JSON.stringify({ startTime: Date.now(), duration: initialTime })
      );
      startInterview();
    }
  }, [resumeId, initialTime]);

  // Start the interview and play initial greeting
  const startInterview = async () => {
    setLoadingContext(true);
    try {
      const res = await fetch(`http://localhost:8000/interview/${resumeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to start interview");
      }
      const data = await res.json();
      const initialMessage = {
        question: "",
        answer: data.initial_message || "Hello! I'm excited to conduct your interview today. Let's get started with a simple question to build rapport.",
        timestamp: new Date().toLocaleTimeString(),
        audio_url: data.audio_url,
      };
      setChatLog([initialMessage]);
      if (data.audio_url) playAudio(data.audio_url);
      console.log("Started interview, initial message:", initialMessage);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start interview.";
      setError(errorMessage);
      toast.error(errorMessage, { style: getToastStyle(theme!) });
    } finally {
      setLoadingContext(false);
    }
  };

  // Fetch interview summary when the interview ends
  const fetchInterviewSummary = async (retries = 3, delay = 2000): Promise<void> => {
    try {
      const res = await fetch(`http://localhost:8000/summary/${resumeId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP error ${res.status}`);
      }
      const data = await res.json();
      console.log("Fetched summary:", data);
      setInterviewSummary({
        decision: data.decision,
        conversation: data.conversation.length > 0 ? data.conversation : chatLog,
      });
      if (data.decision) {
        setIsHired(data.decision.status === "hired");
        localStorage.setItem(`interviewDecision_${resumeId}`, JSON.stringify(data.decision));
        setIsDialogOpen(true);
      } else if (retries > 0) {
        console.warn(`No decision found, retrying... (${retries} retries left)`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return fetchInterviewSummary(retries - 1, delay * 1.5);
      } else {
        setInterviewSummary({
          decision: {
            status: "not hired",
            scores: {
              technical_depth: 50,
              communication: 50,
              problem_solving: 50,
              total: 50,
            },
          },
          conversation: chatLog,
        });
        setIsHired(false);
        setIsDialogOpen(true);
      }
    } catch (err) {
      console.error("Error fetching summary:", err);
      setInterviewSummary({
        decision: {
          status: "not hired",
          scores: {
            technical_depth: 50,
            communication: 50,
            problem_solving: 50,
            total: 50,
          },
        },
        conversation: chatLog,
      });
      setIsHired(false);
      setIsDialogOpen(true);
    }
  };

  // Timer logic
  // Timer logic
  useEffect(() => {
    if (isTimerExpired || timeLeft <= 0 || isDialogOpen) {
      if (timeLeft <= 0 && !isDialogOpen && !isAnalyzing && !loadingAnswer) {
        setIsTimerExpired(true);
        setIsAnalyzing(true);
        // Instead of calling handleEndCall, fetch the summary and show the dialog
        fetchInterviewSummary().then(() => {
          setIsAnalyzing(false);
        });
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          localStorage.removeItem(`interviewTimer_${resumeId}`);
        }
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

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [chatLog]);

  // Handle voice input
  const handleVoiceInput = async () => {
    if (!resumeId || !isValidUUID(resumeId)) {
      setError("Invalid resume ID. Please upload a resume first.");
      toast.error("Invalid resume ID.", { style: getToastStyle(theme!) });
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
            if (!AudioContextConstructor) throw new Error("AudioContext is not supported in this browser");
            const audioContext = new AudioContextConstructor();
            const arrayBuffer = await audioBlob.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            audioBlob = await convertToWav(audioBuffer);
            console.log("Converted WebM to WAV client-side");
          } catch (err) {
            console.error("Failed to convert WebM to WAV:", err);
            setError("Failed to process audio. Please try again.");
            toast.error("Failed to process audio.", { style: getToastStyle(theme!), duration: 5000 });
            stream.getTracks().forEach((track) => track.stop());
            return;
          }

          const formData = new FormData();
          formData.append("file", audioBlob, "recording.wav");
          formData.append("thread_id", resumeId);

          setLoadingAnswer(true);
          setError("");

          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const res = await fetch(`http://localhost:8000/voice-chat/${resumeId}`, {
              method: "POST",
              body: formData,
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              let errorMessage = data.detail || `HTTP error ${res.status}`;
              if (res.status === 401) {
                errorMessage = "Authentication error: Invalid API key.";
              } else if (res.status === 400 && errorMessage.includes("Only WAV, FLAC, OGG, or MP3 allowed")) {
                errorMessage = "Unsupported audio format. Please try again.";
              } else if (res.status === 400 && errorMessage.includes("Speech recognition")) {
                errorMessage = "Could not transcribe audio. Please speak clearly and try again.";
              }
              throw new Error(errorMessage);
            }

            const data = await res.json();
            if (!data.question || !data.answer || !data.audio_url) {
              throw new Error("Incomplete response from server: missing question, answer, or audio_url");
            }

            const newMessage = {
              question: data.question,
              answer: data.answer,
              timestamp: new Date().toLocaleTimeString(),
              audio_url: data.audio_url,
            };
            setChatLog((prev) => [...prev, newMessage]);
            setQuestion("");
            if (data.audio_url) playAudio(data.audio_url);

            // If the interviewer ends the interview, show the analysis dialog
            if (data.decision?.status || data.question.toLowerCase() === "end interview") {
              setInterviewSummary({ decision: data.decision, conversation: [...chatLog, newMessage] });
              setIsHired(data.decision?.status === "hired");
              setIsDialogOpen(true);
              localStorage.setItem(`interviewDecision_${resumeId}`, JSON.stringify(data.decision));
              localStorage.removeItem(`interviewTimer_${resumeId}`);
              setIsTimerExpired(true); // Prevent further interaction
            }

            toast.success("Response received!", { style: getToastStyle(theme!) });
            console.log("Voice response added to chatLog:", newMessage);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to process response.";
            setError(errorMessage);
            toast.error(errorMessage, { style: getToastStyle(theme!), duration: 5000 });
            console.error("Voice chat error:", err);
          } finally {
            setLoadingAnswer(false);
          }

          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        toast.info("Recording started. Speak clearly...", { style: getToastStyle(theme!) });
      } catch (err) {
        setError("Microphone access denied or unavailable.");
        toast.error("Microphone access denied or unavailable.", { style: getToastStyle(theme!), duration: 5000 });
      }
    }
  };

  // Text-based input
  // Text-based input
  async function handleAsk(endInterview?: string) {
    if (!resumeId || !isValidUUID(resumeId)) {
      setError("Invalid resume ID. Please upload a resume first.");
      toast.error("Invalid resume ID.", { style: getToastStyle(theme!) });
      return;
    }

    if (!endInterview && (!question.trim() || timeLeft <= 0 || isTimerExpired)) return;

    setLoadingAnswer(true);
    setError("");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`http://localhost:8000/chat/${resumeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: endInterview || question, thread_id: resumeId }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        let errorMessage = data.detail || "Error getting response";
        if (res.status === 401) {
          errorMessage = "Authentication error: Invalid API key.";
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      if (!data.question || !data.answer || !data.audio_url) {
        throw new Error("Incomplete response from server: missing question, answer, or audio_url");
      }

      console.log("Text chat response:", { question: data.question, answer: data.answer, audio_url: data.audio_url });

      const newMessage = {
        question: data.question,
        answer: data.answer,
        timestamp: new Date().toLocaleTimeString(),
        audio_url: data.audio_url,
      };
      setChatLog((prev) => [...prev, newMessage]);
      setQuestion("");
      if (data.audio_url) playAudio(data.audio_url);

      // If the interviewer ends the interview, show the analysis dialog
      if (!endInterview && (data.decision?.status || data.question.toLowerCase() === "end interview")) {
        setInterviewSummary({ decision: data.decision, conversation: [...chatLog, newMessage] });
        setIsHired(data.decision?.status === "hired");
        setIsDialogOpen(true);
        localStorage.setItem(`interviewDecision_${resumeId}`, JSON.stringify(data.decision));
        localStorage.removeItem(`interviewTimer_${resumeId}`);
        setIsTimerExpired(true); // Prevent further interaction
      }

      toast.success("Response received!", { style: getToastStyle(theme!) });
      console.log("Text response added to chatLog:", newMessage);
    } catch (err) {
      const errorMessage = err instanceof Error ? (err.name === "AbortError" ? "Request timed out." : err.message) : "Unknown error";
      setError(errorMessage);
      toast.error(errorMessage, { style: getToastStyle(theme!), duration: 5000 });
    } finally {
      setLoadingAnswer(false);
    }
  }

  // Handle End Call with Redirect to /resume
  // Handle End Call with Redirect to /resume (only when user clicks)
  const handleEndCall = async () => {
    // If there's already a decision, redirect immediately
    if (localStorage.getItem(`interviewDecision_${resumeId}`)) {
      router.push("/resume");
      return;
    }

    // Set states to indicate the interview is ending
    setLoadingAnswer(true);
    setIsTimerExpired(true);
    setIsAnalyzing(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`http://localhost:8000/chat/${resumeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "end interview", thread_id: resumeId }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        let errorMessage = data.detail || "Error getting response";
        if (res.status === 401) {
          errorMessage = "Authentication error: Invalid API key.";
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      const finalDecision = data.decision || {
        status: "not hired",
        scores: {
          technical_depth: 50,
          communication: 50,
          problem_solving: 50,
          total: 50,
        },
      };

      // Store the decision in localStorage
      localStorage.setItem(`interviewDecision_${resumeId}`, JSON.stringify(finalDecision));
      localStorage.removeItem(`interviewTimer_${resumeId}`);

      // Redirect immediately to /resume since this is a user-initiated end
      router.push("/resume");
    } catch (err) {
      console.error("Error ending interview:", err);
      localStorage.setItem(
        `interviewDecision_${resumeId}`,
        JSON.stringify({
          status: "not hired",
          scores: {
            technical_depth: 50,
            communication: 50,
            problem_solving: 50,
            total: 50,
          },
        })
      );
      localStorage.removeItem(`interviewTimer_${resumeId}`);
      router.push("/resume");
    } finally {
      setLoadingAnswer(false);
      setIsAnalyzing(false);
    }
  };

  const handleResetInterview = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
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

  const handleBackToUpload = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
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

  // Error for invalid/missing resumeId
  if (!resumeId || !isValidUUID(resumeId)) {
    return (
      <main className={cn("min-h-screen flex flex-col items-center justify-center p-6", theme === "dark" ? "bg-gray-900" : "bg-gray-100")}>
        <Card className={cn("w-full max-w-md shadow-lg rounded-xl", theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200")}>
          <CardContent className="p-8 text-center">
            <p className={cn("text-lg font-semibold", theme === "dark" ? "text-red-400" : "text-red-600")}>Invalid or missing resume ID. Please upload a resume first.</p>
            <Button
              onClick={handleBackToUpload}
              className={cn("mt-6 w-full rounded-xl py-3", theme === "dark" ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-700 hover:bg-blue-800 text-white")}
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
    <main className={cn("min-h-screen flex flex-col p-4 sm:p-6", theme === "dark" ? "bg-gray-900" : "bg-gray-100")}>
      <Toaster position="top-center" expand={true} richColors closeButton />
      <div className="w-full max-w-7xl mx-auto flex flex-col h-[calc(100vh-2rem)] sm:h-[calc(100vh-3rem)]">
        {/* Status Bar */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className={cn("flex justify-between items-center p-4 sm:p-5 rounded-xl shadow-md", theme === "dark" ? "bg-gray-800" : "bg-white")}
        >
          <div className="flex items-center space-x-3">
            <Button
              onClick={handleBackToUpload}
              variant="ghost"
              className={cn("text-sm font-medium", theme === "dark" ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900")}
              aria-label="Back to upload"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Upload
            </Button>
            <span className={cn("text-sm font-semibold", theme === "dark" ? "text-gray-200" : "text-gray-700")}>Virtual Interview | Connected</span>
          </div>
          <div className="flex items-center space-x-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={toggleMute}
                    variant="ghost"
                    className={cn(theme === "dark" ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900")}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="w-10 h-10">
              <CircularProgressbar
                value={(timeLeft / initialTime) * 100}
                text={formatTime(timeLeft)}
                styles={buildStyles({
                  textSize: "28px",
                  pathColor: theme === "dark" ? "#60A5FA" : "#3B82F6",
                  textColor: theme === "dark" ? "#E5E7EB" : "#1F2937",
                  trailColor: theme === "dark" ? "#4B5563" : "#D1D5DB",
                })}
              />
            </div>
            <ModeToggle />
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 mt-4 sm:mt-6">
          {/* Video Feed */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className={cn("lg:col-span-3 flex flex-col rounded-xl overflow-hidden shadow-lg", theme === "dark" ? "bg-gray-800" : "bg-white")}
          >
            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 relative">
              <motion.div
                animate={{ scale: loadingAnswer || isAnalyzing ? [1, 1.02, 1] : 1 }}
                transition={{ duration: 1, repeat: loadingAnswer || isAnalyzing ? Infinity : 0 }}
                className="text-center"
              >
                <div className={cn("p-8 sm:p-10 rounded-full shadow-2xl inline-block", theme === "dark" ? "bg-blue-600/20" : "bg-blue-100/30")}>
                  <UserCircle className={cn("h-32 w-32 sm:h-48 sm:w-48", theme === "dark" ? "text-blue-400" : "text-blue-600")} />
                </div>
                <p className={cn("mt-4 sm:mt-6 text-xl sm:text-2xl font-semibold", theme === "dark" ? "text-gray-100" : "text-gray-800")}>AI Interviewer</p>
                <p className={cn("text-sm sm:text-base", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                  {loadingContext ? "Preparing interview..." : isAnalyzing ? "Analyzing performance..." : loadingAnswer ? "Processing response..." : "Awaiting your response..."}
                </p>
              </motion.div>
              {/* Self-View Thumbnail */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 w-24 h-16 sm:w-36 sm:h-24 rounded-lg overflow-hidden shadow-md bg-gray-800/90 flex items-center justify-center"
              >
                <UserCircle className={cn("h-12 w-12 sm:h-16 sm:w-16", theme === "dark" ? "text-gray-400" : "text-gray-500")} />
                <span className={cn("absolute bottom-2 left-2 text-xs font-medium", theme === "dark" ? "text-gray-300" : "text-gray-600")}>You</span>
              </motion.div>
            </div>
          </motion.div>

          {/* Chat Sidebar */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className={cn("lg:col-span-2 flex flex-col rounded-xl shadow-lg transition-all duration-300", isChatOpen ? "w-full" : "w-12", theme === "dark" ? "bg-gray-800" : "bg-white")}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className={cn("text-lg sm:text-xl font-semibold", theme === "dark" ? "text-gray-100" : "text-gray-800", !isChatOpen && "hidden")}>Conversation History</h2>
              <Button
                variant="ghost"
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={cn(theme === "dark" ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900")}
                aria-label={isChatOpen ? "Collapse chat" : "Expand chat"}
              >
                {isChatOpen ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
              </Button>
            </div>
            <div
              className={cn("flex-1 overflow-y-auto p-4 sm:p-5 space-y-4", !isChatOpen && "hidden", "min-h-0")}
              style={{ maxHeight: "calc(100vh - 280px)" }}
              ref={chatContainerRef}
              role="log"
              aria-live="polite"
            >
              {loadingContext ? (
                <p className={cn("text-center text-sm font-medium", theme === "dark" ? "text-gray-400" : "text-gray-500")}>Connecting please wait...</p>
              ) : error ? (
                <p className={cn("text-center text-sm font-semibold", theme === "dark" ? "text-red-400" : "text-red-600")}>Error: {error}</p>
              ) : isAnalyzing ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center items-center">
                  <Loader2 className={cn("h-6 w-6 animate-spin", theme === "dark" ? "text-blue-400" : "text-blue-600")} />
                  <p className={cn("ml-2 text-sm font-medium", theme === "dark" ? "text-gray-200" : "text-gray-700")}>Analyzing...</p>
                </motion.div>
              ) : chatLog.length === 0 ? (
                <p className={cn("text-center text-sm font-medium", theme === "dark" ? "text-gray-400" : "text-gray-500")}>No conversation yet. Respond to start!</p>
              ) : (
                chatLog.map((chat, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-3">
                    {chat.answer && (
                      <div className="flex justify-start">
                        <div className={cn("max-w-[85%] p-4 rounded-xl text-sm shadow-sm", theme === "dark" ? "bg-blue-600/70 text-white" : "bg-blue-100 text-blue-900")}>
                          <p className="font-semibold text-sm sm:text-base">Interviewer</p>
                          <p className="mt-1 text-sm sm:text-base">{chat.answer}</p>
                          <p className="text-xs opacity-70 mt-2">{chat.timestamp}</p>
                        </div>
                      </div>
                    )}
                    {chat.question && (
                      <div className="flex justify-end">
                        <div className={cn("max-w-[85%] p-4 rounded-xl text-sm shadow-sm", theme === "dark" ? "bg-gray-600/70 text-white" : "bg-gray-200 text-gray-900")}>
                          <p className="font-semibold text-sm sm:text-base">You</p>
                          <p className="mt-1 text-sm sm:text-base">{chat.question}</p>
                          <p className="text-xs opacity-70 mt-2">{chat.timestamp}</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
            {isChatOpen && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <Label htmlFor="questionInput" className="sr-only">Your Response</Label>
                <Input
                  id="questionInput"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAsk();
                    }
                  }}
                  disabled={loadingAnswer || timeLeft <= 0 || isTimerExpired || isAnalyzing}
                  className={cn(
                    "w-full rounded-xl py-3 text-sm shadow-sm",
                    theme === "dark" ? "bg-gray-700 text-gray-100 border-gray-600 focus:ring-blue-400 placeholder-gray-400" : "bg-white text-gray-900 border-gray-200 focus:ring-blue-500 placeholder-gray-500",
                    "focus:ring-2 transition-all"
                  )}
                  placeholder="Type your response (optional)..."
                  aria-label="Type your response"
                />
              </div>
            )}
          </motion.div>
        </div>

        {/* Control Bar */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className={cn("flex justify-center items-center p-4 sm:p-5 mt-4 sm:mt-6 rounded-xl shadow-md", theme === "dark" ? "bg-gray-800" : "bg-white")}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleVoiceInput}
                  disabled={loadingContext || loadingAnswer || timeLeft <= 0 || isTimerExpired || isAnalyzing} // Added loadingContext here
                  className={cn(
                    "relative px-6 sm:px-8 py-3 rounded-full font-semibold text-base sm:text-lg shadow-lg",
                    isRecording ? (theme === "dark" ? "bg-red-600 hover:bg-red-500" : "bg-red-500 hover:bg-red-600") : theme === "dark" ? "bg-green-600 hover:bg-green-500" : "bg-green-500 hover:bg-green-600",
                    "text-white transition-all transform hover:scale-105",
                    isRecording && "animate-pulse ring-4 ring-red-300/30 dark:ring-red-700/30"
                  )}
                  aria-label={isRecording ? "Stop recording" : "Start recording"}
                >
                  <motion.div
                    animate={{ scale: isRecording ? [1, 1.1, 1] : 1 }}
                    transition={{ duration: 0.8, repeat: isRecording ? Infinity : 0 }}
                    className="flex items-center"
                  >
                    {isRecording ? <MicOff className="h-5 w-5 sm:h-6 sm:w-6 mr-2" /> : <Mic className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />}
                    {isRecording ? "Stop Recording" : "Start Recording"}
                  </motion.div>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isRecording ? "Stop recording your response" : "Start recording your response"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleEndCall}
                  disabled={loadingAnswer || isTimerExpired || isAnalyzing || !!localStorage.getItem(`interviewDecision_${resumeId}`)}
                  className={cn(
                    "ml-4 sm:ml-6 px-6 sm:px-8 py-3 rounded-full font-semibold text-base sm:text-lg shadow-lg",
                    theme === "dark" ? "bg-red-600 hover:bg-red-500 text-white" : "bg-red-500 hover:bg-red-600 text-white",
                    "transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                  aria-label="End interview"
                >
                  <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                  End Interview
                </Button>
              </TooltipTrigger>
              <TooltipContent>End the interview and redirect to resume page</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </motion.div>

        {/* Hiring Decision Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => !isAnalyzing && setIsDialogOpen(open)}>
          <DialogContent
            className={cn(
              "rounded-2xl max-w-4xl max-h-[90vh] overflow-y-auto p-6 sm:p-8",
              theme === "dark" ? "bg-gray-800 border-gray-700 text-gray-100" : "bg-white border-gray-200 text-gray-900"
            )}
            role="dialog"
            aria-labelledby="dialog-title"
          >
            <DialogHeader>
              <DialogTitle
                id="dialog-title"
                className={cn(
                  "text-2xl sm:text-3xl font-bold tracking-tight",
                  isAnalyzing ? (theme === "dark" ? "text-gray-200" : "text-gray-800") : isHired ? (theme === "dark" ? "text-green-400" : "text-green-600") : theme === "dark" ? "text-red-400" : "text-red-600"
                )}
              >
                {isAnalyzing ? "Interview Ended" : isHired ? "Congratulations, You're Hired!" : "Interview Outcome"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 sm:py-6 space-y-6 sm:space-y-8">
              {isAnalyzing ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center justify-center py-8"
                >
                  <Loader2 className={cn("h-10 w-10 animate-spin mb-4", theme === "dark" ? "text-blue-400" : "text-blue-600")} />
                  <p className={cn("text-lg font-medium", theme === "dark" ? "text-gray-200" : "text-gray-700")}>Calculating your interview score...</p>
                </motion.div>
              ) : interviewSummary ? (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className={cn("rounded-xl p-4 sm:p-6 shadow-sm", theme === "dark" ? "bg-gray-700" : "bg-gray-100")}
                  >
                    <h3 className="text-lg sm:text-xl font-semibold mb-3 flex items-center">
                      <Info className="h-5 w-5 mr-2" />
                      Hiring Decision
                    </h3>
                    <div className="space-y-3">
                      <p className="text-sm sm:text-base font-medium">
                        Status:{" "}
                        <span className={cn(isHired ? "text-green-500" : "text-red-500")}>
                          {interviewSummary.decision?.status ? (isHired ? "Hired" : "Not Hired") : "Pending"}
                        </span>
                      </p>
                      <p className="text-sm sm:text-base leading-relaxed">
                        {interviewSummary.decision?.status
                          ? isHired
                            ? "We are thrilled to welcome you to the team! Your performance during the interview was exceptional."
                            : "Thank you for taking the time to interview with us. Unfortunately, we will not be moving forward at this time."
                          : "No final decision was provided by the server."}
                      </p>
                    </div>
                  </motion.div>

                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center justify-center py-8"
                >
                  <p className={cn("text-lg font-medium", theme === "dark" ? "text-gray-200" : "text-gray-700")}>Interview Completed</p>
                  <p className={cn("text-sm mt-2", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                    Thank you for participating in the interview.
                  </p>
                </motion.div>
              )}
            </div>
            {!isAnalyzing && (
              <DialogFooter className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4">
                <Button
                  onClick={handleBackToUpload}
                  className={cn(
                    "rounded-xl font-medium px-6 py-3 w-full sm:w-auto",
                    theme === "dark" ? "bg-gray-600 hover:bg-gray-500 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                  )}
                  aria-label="Back to upload"
                >
                  Back to Upload
                </Button>
                <Button
                  onClick={handleResetInterview}
                  className={cn(
                    "rounded-xl font-medium px-6 py-3 w-full sm:w-auto",
                    theme === "dark" ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-700 hover:bg-blue-800 text-white"
                  )}
                  aria-label="Start new interview"
                >
                  Start New Interview
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}