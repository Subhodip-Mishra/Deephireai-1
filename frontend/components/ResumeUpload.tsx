"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, X, CheckCircle2, Clock, ArrowRight, Shield, Zap, Target, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/ModeToggle";
import { motion } from "framer-motion";

interface DurationOption {
  value: string;
  label: string;
  recommended?: boolean;
}

export default function ResumeUpload() {
  const router = useRouter();
  const { theme } = useTheme();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [interviewDuration, setInterviewDuration] = useState("600");
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("File size exceeds 10MB limit.");
        return;
      }
      setFile(selectedFile);
      toast.success("PDF resume selected successfully");
      setCurrentStep(2);
    } else {
      setFile(null);
      toast.error("Please upload a valid PDF file");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const simulateProgress = () => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prevProgress) => {
        if (prevProgress >= 95) {
          clearInterval(interval);
          return prevProgress;
        }
        return prevProgress + 5;
      });
    }, 200);
    return interval;
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("No file selected. Please upload a PDF resume.");
      return;
    }

    setUploading(true);
    const progressInterval = simulateProgress();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("duration", interviewDuration);

    try {
      const res = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to upload resume");
      }

      const data = await res.json();
      clearInterval(progressInterval);
      setUploadProgress(100);
      toast.success("Resume uploaded successfully!");
      setCurrentStep(3);

      setTimeout(() => {
        router.push(`/interview?resumeId=${data.resume_id}&duration=${interviewDuration}`);
      }, 2000);
    } catch (err) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      const errorMessage = err instanceof Error ? err.message : "Something went wrong during upload.";
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleClear = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setFile(null);
    setUploadProgress(0);
    setCurrentStep(1);
    toast.info("File cleared");
  };

  const formatDuration = (seconds: string): string => {
    const minutes = parseInt(seconds) / 60;
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  };

  const durationOptions: DurationOption[] = [
    { value: "300", label: "5 minutes" },
    { value: "600", label: "10 minutes", recommended: true },
    { value: "900", label: "15 minutes" },
    { value: "1800", label: "30 minutes" },
  ];

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={cn(
        "min-h-screen bg-gradient-to-br relative overflow-hidden",
        theme === "dark"
          ? "from-gray-900 via-gray-800 to-gray-900"
          : "from-slate-50 via-blue-50 to-indigo-100"
      )}
    >
      {/* Background Elements */}
      <div
        className={cn(
          "absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent)] pointer-events-none",
          theme === "dark" && "opacity-50"
        )}
      />
      <div
        className={cn(
          "absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(147,51,234,0.08),transparent)] pointer-events-none",
          theme === "dark" && "opacity-50"
        )}
      />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="w-full px-6 py-8">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  theme === "dark"
                    ? "bg-gradient-to-br from-indigo-500 to-purple-500"
                    : "bg-gradient-to-br from-indigo-600 to-purple-600"
                )}
              >
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1
                  className={cn(
                    "text-xl font-bold",
                    theme === "dark" ? "text-white" : "text-slate-900"
                  )}
                >
                  DeepHire AI
                </h1>
                <p
                  className={cn(
                    "text-sm",
                    theme === "dark" ? "text-gray-400" : "text-slate-600"
                  )}
                >
                  Interview Intelligence Platform
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge
                variant="secondary"
                className={cn(
                  theme === "dark"
                    ? "bg-emerald-900/50 text-emerald-300 border-emerald-800"
                    : "bg-emerald-100 text-emerald-800 border-emerald-200"
                )}
              >
                <Shield className="h-3 w-3 mr-1" />
                Enterprise Secure
              </Badge>
              <ModeToggle />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-6 pb-8">
          <div className="w-full max-w-4xl">
            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2
                className={cn(
                  "text-5xl font-bold mb-4 tracking-tight",
                  theme === "dark" ? "text-white" : "text-slate-900"
                )}
              >
                AI-Powered Interview
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {" "}
                  Assistant
                </span>
              </h2>
              <p
                className={cn(
                  "text-xl mb-8 max-w-2xl mx-auto leading-relaxed",
                  theme === "dark" ? "text-gray-300" : "text-slate-600"
                )}
              >
                Upload your resume and get personalized interview questions tailored to your experience and the role you're targeting
              </p>

              {/* Feature Pills */}
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                {[
                  { icon: Zap, text: "AI-Generated Questions", color: "text-amber-500" },
                  { icon: Target, text: "Personalized Experience", color: "text-blue-500" },
                  { icon: Shield, text: "Secure & Private", color: "text-emerald-500" },
                ].map((feature, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1, duration: 0.3 }}
                    className={cn(
                      "flex items-center rounded-full px-4 py-2 border shadow-sm",
                      theme === "dark"
                        ? "bg-gray-800/80 border-gray-700 text-gray-200"
                        : "bg-white/80 border-slate-200 text-slate-700"
                    )}
                  >
                    <feature.icon className={cn("h-4 w-4 mr-2", feature.color)} />
                    <span className="text-sm font-medium">{feature.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Progress Steps */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-12"
            >
              <div className="flex justify-center items-center relative max-w-md mx-auto">
                {[1, 2, 3].map((step, index) => (
                  <div key={step} className="flex items-center">
                    <div className="flex flex-col items-center relative z-10">
                      <motion.div
                        animate={{
                          scale: currentStep === step ? 1.1 : 1,
                          transition: { duration: 0.3 },
                        }}
                        className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500",
                          currentStep === step
                            ? theme === "dark"
                              ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg"
                              : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                            : currentStep > step
                            ? theme === "dark"
                              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md"
                              : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md"
                            : theme === "dark"
                            ? "bg-gray-700 text-gray-400 border-2 border-gray-600"
                            : "bg-white text-slate-400 border-2 border-slate-200 shadow-sm"
                        )}
                      >
                        {currentStep > step ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : (
                          <span className="font-semibold">{step}</span>
                        )}
                      </motion.div>
                      <span
                        className={cn(
                          "text-xs mt-3 font-medium transition-colors duration-300",
                          currentStep === step
                            ? theme === "dark"
                              ? "text-indigo-400"
                              : "text-indigo-600"
                            : currentStep > step
                            ? theme === "dark"
                              ? "text-emerald-400"
                              : "text-emerald-600"
                            : theme === "dark"
                            ? "text-gray-400"
                            : "text-slate-400"
                        )}
                      >
                        {step === 1 ? "Upload Resume" : step === 2 ? "Configure" : "Start Interview"}
                      </span>
                    </div>
                    {index < 2 && (
                      <div className="w-16 h-0.5 mx-4 relative">
                        <motion.div
                          animate={{
                            width: currentStep > step + 1 ? "100%" : currentStep === step + 1 ? "50%" : "0%",
                          }}
                          transition={{ duration: 0.5 }}
                          className={cn(
                            "absolute top-0 left-0 h-full",
                            theme === "dark"
                              ? currentStep > step
                                ? "bg-gradient-to-r from-indigo-500 to-purple-500"
                                : "bg-gray-700"
                              : currentStep > step
                              ? "bg-gradient-to-r from-indigo-600 to-purple-600"
                              : "bg-slate-200"
                          )}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Main Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl mx-auto"
            >
              <Card
                className={cn(
                  "shadow-2xl border-0 rounded-3xl overflow-hidden",
                  theme === "dark"
                    ? "bg-gray-800/90 backdrop-blur-xl"
                    : "bg-white/90 backdrop-blur-xl"
                )}
              >
                <CardHeader
                  className={cn(
                    "border-b pb-8",
                    theme === "dark"
                      ? "bg-gradient-to-r from-gray-800 to-gray-700 border-gray-700"
                      : "bg-gradient-to-r from-slate-50 to-blue-50 border-slate-100"
                  )}
                >
                  <CardTitle
                    className={cn(
                      "text-2xl font-bold text-center",
                      theme === "dark" ? "text-white" : "text-slate-900"
                    )}
                  >
                    {currentStep === 1 && "Upload Your Resume"}
                    {currentStep === 2 && "Interview Configuration"}
                    {currentStep === 3 && "Ready to Begin"}
                  </CardTitle>
                  <CardDescription
                    className={cn(
                      "text-center text-lg",
                      theme === "dark" ? "text-gray-300" : "text-slate-600"
                    )}
                  >
                    {currentStep === 1 && "Drop your PDF resume to get started with personalized questions"}
                    {currentStep === 2 && "Customize your interview experience and duration"}
                    {currentStep === 3 && "Your AI interview session is ready to launch"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-8">
                  {currentStep === 1 && (
                    <div
                      {...getRootProps()}
                      className={cn(
                        "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300",
                        isDragActive
                          ? theme === "dark"
                            ? "border-indigo-400 bg-indigo-900/30 scale-[0.98] shadow-inner"
                            : "border-indigo-400 bg-indigo-50 scale-[0.98] shadow-inner"
                          : file
                          ? theme === "dark"
                            ? "border-emerald-400 bg-emerald-900/30"
                            : "border-emerald-400 bg-emerald-50"
                          : theme === "dark"
                          ? "border-gray-600 hover:border-indigo-400 hover:bg-indigo-900/20"
                          : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50"
                      )}
                      role="region"
                      aria-label="Dropzone for PDF resume upload"
                    >
                      <input {...getInputProps()} />
                      <div className="flex flex-col items-center">
                        {file ? (
                          <div
                            className={cn(
                              "p-4 rounded-full mb-6",
                              theme === "dark" ? "bg-emerald-900/50" : "bg-emerald-100"
                            )}
                          >
                            <CheckCircle2
                              className={cn(
                                "h-12 w-12",
                                theme === "dark" ? "text-emerald-400" : "text-emerald-600"
                              )}
                            />
                          </div>
                        ) : (
                          <div
                            className={cn(
                              "p-4 rounded-full mb-6",
                              theme === "dark" ? "bg-gray-700" : "bg-slate-100"
                            )}
                          >
                            <Upload
                              className={cn(
                                "h-12 w-12",
                                theme === "dark" ? "text-gray-300" : "text-slate-500"
                              )}
                            />
                          </div>
                        )}
                        {isDragActive ? (
                          <div className="space-y-2">
                            <p
                              className={cn(
                                "text-xl font-semibold",
                                theme === "dark" ? "text-indigo-300" : "text-indigo-700"
                              )}
                            >
                              Drop your resume here
                            </p>
                            <p
                              className={cn(
                                theme === "dark" ? "text-gray-400" : "text-slate-600"
                              )}
                            >
                              Release to upload your PDF
                            </p>
                          </div>
                        ) : file ? (
                          <div className="space-y-3">
                            <p
                              className={cn(
                                "text-xl font-semibold",
                                theme === "dark" ? "text-emerald-300" : "text-emerald-700"
                              )}
                            >
                              Resume Uploaded Successfully
                            </p>
                            <div
                              className={cn(
                                "flex items-center justify-center space-x-2 rounded-lg p-3 shadow-sm",
                                theme === "dark" ? "bg-gray-700" : "bg-white"
                              )}
                            >
                              <FileText
                                className={cn(
                                  "h-5 w-5",
                                  theme === "dark" ? "text-emerald-400" : "text-emerald-600"
                                )}
                              />
                              <span
                                className={cn(
                                  "text-sm font-medium truncate max-w-[200px]",
                                  theme === "dark" ? "text-gray-200" : "text-slate-700"
                                )}
                              >
                                {file.name}
                              </span>
                              <button
                                onClick={handleClear}
                                className={cn(
                                  "p-1 rounded-full",
                                  theme === "dark"
                                    ? "hover:bg-gray-600"
                                    : "hover:bg-slate-100"
                                )}
                              >
                                <X
                                  className={cn(
                                    "h-4 w-4",
                                    theme === "dark" ? "text-gray-400" : "text-slate-400"
                                  )}
                                />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <p
                                className={cn(
                                  "text-xl font-semibold",
                                  theme === "dark" ? "text-gray-200" : "text-slate-700"
                                )}
                              >
                                Choose your resume PDF
                              </p>
                              <p
                                className={cn(
                                  theme === "dark" ? "text-gray-400" : "text-slate-500"
                                )}
                              >
                                Drag and drop or click to browse files
                              </p>
                            </div>
                            <div
                              className={cn(
                                "text-xs rounded-lg p-3",
                                theme === "dark"
                                  ? "bg-gray-700 text-gray-400"
                                  : "bg-slate-50 text-slate-400"
                              )}
                            >
                              Maximum file size: 10MB • PDF format only
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-8">
                      {file && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className={cn(
                            "rounded-xl p-4 border",
                            theme === "dark"
                              ? "bg-gray-700/60 border-gray-600"
                              : "bg-slate-50 border-slate-200"
                          )}
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={cn(
                                "p-2 rounded-lg",
                                theme === "dark" ? "bg-indigo-900" : "bg-indigo-100"
                              )}
                            >
                              <FileText
                                className={cn(
                                  "h-5 w-5",
                                  theme === "dark" ? "text-indigo-300" : "text-indigo-600"
                                )}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={cn(
                                  "font-medium truncate",
                                  theme === "dark" ? "text-gray-200" : "text-slate-900"
                                )}
                              >
                                {file.name}
                              </p>
                              <p
                                className={cn(
                                  "text-sm",
                                  theme === "dark" ? "text-gray-400" : "text-slate-500"
                                )}
                              >
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                            <Badge
                              variant="secondary"
                              className={cn(
                                theme === "dark"
                                  ? "bg-emerald-900/50 text-emerald-300"
                                  : "bg-emerald-100 text-emerald-700"
                              )}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Ready
                            </Badge>
                          </div>
                        </motion.div>
                      )}

                      <div className="space-y-4">
                        <Label
                          className={cn(
                            "text-lg font-semibold flex items-center space-x-2",
                            theme === "dark" ? "text-gray-200" : "text-slate-900"
                          )}
                        >
                          <Clock
                            className={cn(
                              "h-5 w-5",
                              theme === "dark" ? "text-indigo-400" : "text-indigo-600"
                            )}
                          />
                          <span>Interview Duration</span>
                        </Label>
                        <div className="relative">
                          <select
                            value={interviewDuration}
                            onChange={(e) => setInterviewDuration(e.target.value)}
                            className={cn(
                              "w-full p-4 rounded-xl text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200",
                              theme === "dark"
                                ? "bg-gray-700 border-gray-600 text-gray-200 hover:border-indigo-400"
                                : "bg-white border-slate-200 text-slate-900 hover:border-indigo-400"
                            )}
                            aria-label="Select interview duration"
                          >
                            {durationOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                                {option.recommended ? " (Recommended)" : ""}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            className={cn(
                              "absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5",
                              theme === "dark" ? "text-gray-400" : "text-slate-400"
                            )}
                          />
                        </div>
                        <div
                          className={cn(
                            "border rounded-xl p-4",
                            theme === "dark"
                              ? "bg-blue-900/50 border-blue-800 text-blue-300"
                              : "bg-blue-50 border-blue-200 text-blue-700"
                          )}
                        >
                          <p className="text-sm">
                            <strong>{formatDuration(interviewDuration)}</strong> provides time for approximately{" "}
                            <strong>
                              {Math.floor(parseInt(interviewDuration) / 60)}-{Math.ceil(parseInt(interviewDuration) / 45)}
                            </strong>{" "}
                            questions, perfect for a comprehensive interview experience.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                      className="text-center space-y-6"
                    >
                      <div
                        className={cn(
                          "p-6 rounded-2xl border",
                          theme === "dark"
                            ? "bg-gradient-to-br from-emerald-900/50 to-teal-900/50 border-emerald-800"
                            : "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200"
                        )}
                      >
                        <div
                          className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                            theme === "dark"
                              ? "bg-gradient-to-br from-emerald-500 to-teal-500"
                              : "bg-gradient-to-br from-emerald-500 to-teal-500"
                          )}
                        >
                          <CheckCircle2 className="h-8 w-8 text-white" />
                        </div>
                        <h3
                          className={cn(
                            "text-2xl font-bold mb-2",
                            theme === "dark" ? "text-white" : "text-slate-900"
                          )}
                        >
                          All Set to Begin!
                        </h3>
                        <p
                          className={cn(
                            "mb-4",
                            theme === "dark" ? "text-gray-300" : "text-slate-600"
                          )}
                        >
                          Your personalized {formatDuration(interviewDuration)} interview experience is ready
                        </p>
                        <div
                          className={cn(
                            "rounded-xl p-4 border",
                            theme === "dark"
                              ? "bg-gray-700 border-gray-600 text-gray-200"
                              : "bg-white border-emerald-200 text-slate-700"
                          )}
                        >
                          <p className="text-sm">
                            Our AI has analyzed your resume and prepared tailored questions to help you demonstrate your skills and experience effectively.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {(uploading || uploadProgress > 0) && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4 mt-6"
                    >
                      <div className="flex justify-between items-center">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            theme === "dark" ? "text-gray-200" : "text-slate-700"
                          )}
                        >
                          {uploadProgress < 100 ? "Processing your resume..." : "Preparing your interview..."}
                        </span>
                        <span
                          className={cn(
                            "text-sm font-bold",
                            theme === "dark" ? "text-indigo-400" : "text-indigo-600"
                          )}
                        >
                          {uploadProgress}%
                        </span>
                      </div>
                      <Progress
                        value={uploadProgress}
                        className={cn(
                          "h-3",
                          theme === "dark" ? "bg-gray-700" : "bg-slate-100",
                          "[&>div]:bg-gradient-to-r",
                          uploadProgress < 100
                            ? "[&>div]:from-indigo-500 [&>div]:to-purple-500"
                            : "[&>div]:from-emerald-500 [&>div]:to-teal-500"
                        )}
                      />
                    </motion.div>
                  )}
                </CardContent>

                <CardFooter
                  className={cn(
                    "border-t p-8",
                    theme === "dark"
                      ? "bg-gray-800 border-gray-700"
                      : "bg-slate-50 border-slate-100"
                  )}
                >
                  <div
                    className={cn("flex w-full", currentStep === 1 ? "justify-end" : "justify-between")}
                  >
                    {currentStep > 1 && (
                      <Button
                        onClick={() => setCurrentStep((prev) => prev - 1)}
                        variant="outline"
                        disabled={uploading}
                        className={cn(
                          "px-6 py-3 rounded-xl font-medium",
                          theme === "dark"
                            ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                            : "border-slate-300 text-slate-700 hover:bg-slate-100"
                        )}
                        aria-label="Go back to previous step"
                      >
                        Back
                      </Button>
                    )}
                    {currentStep < 3 ? (
                      <Button
                        onClick={currentStep === 1 && file ? () => setCurrentStep(2) : handleUpload}
                        disabled={(currentStep === 1 && !file) || uploading}
                        className={cn(
                          "px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200",
                          theme === "dark"
                            ? "bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                            : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                        )}
                        aria-label={currentStep === 1 ? "Continue to configuration" : "Upload and process resume"}
                      >
                        {currentStep === 1 ? "Continue Setup" : "Start Processing"}
                      </Button>
                    ) : (
                      <Button
                        onClick={() =>
                          router.push(
                            `/interview?resumeId=${file ? file.name.split(".")[0] : "unknown"}&duration=${interviewDuration}`
                          )
                        }
                        className={cn(
                          "px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2",
                          theme === "dark"
                            ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                            : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                        )}
                        aria-label="Start the interview"
                      >
                        <span>Begin Interview</span>
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            </motion.div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-6">
          <div
            className={cn(
              "max-w-7xl mx-auto text-center text-sm",
              theme === "dark" ? "text-gray-400" : "text-slate-500"
            )}
          >
            Powered by DeepHire AI • Enterprise-grade security • Your data is processed with the highest privacy standards
          </div>
        </footer>
      </div>
    </div>
  );
}