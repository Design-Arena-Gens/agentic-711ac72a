"use client";

import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  ArrowRight,
  Film,
  Gauge,
  ImageIcon,
  Loader2,
  Sparkles,
  UploadCloud,
  VideoIcon,
} from "lucide-react";

type GenerationMode = "text" | "image" | "reference";

type GenerationResult = {
  jobId: string;
  videoUrl: string;
  posterUrl?: string | null;
  mode: GenerationMode;
  prompt?: string;
  status: "queued" | "processing" | "completed" | "mock";
  metadata: {
    duration: number;
    aspectRatio: string;
    guidance: number;
  };
};

type ModeConfig = {
  label: string;
  tagline: string;
  accent: string;
  icon: ReactNode;
  helper: string;
  suggestions: string[];
};

const MODE_CONFIG: Record<GenerationMode, ModeConfig> = {
  text: {
    label: "Text to Video",
    tagline: "Transform vivid ideas into cinematic motion instantly.",
    accent: "from-orange-500/80 via-pink-500/70 to-fuchsia-500/80",
    icon: <Sparkles className="h-5 w-5" />,
    helper: "Craft evocative prompts describing the scene, mood, movement, and camera style.",
    suggestions: [
      "A lone astronaut exploring neon-lit ruins on an icy planet, cinematic wide shot",
      "Macro shot of raindrops rippling across a koi pond at sunrise, hyper-realistic",
      "Drone flyover of a futuristic coastal city at dusk with bioluminescent waves",
    ],
  },
  image: {
    label: "Image to Video",
    tagline: "Animate your still imagery with parallax, camera moves, and living detail.",
    accent: "from-sky-400/80 via-emerald-400/70 to-lime-400/80",
    icon: <ImageIcon className="h-5 w-5" />,
    helper:
      "Upload a high-quality reference frame. Describe how you want it to move or evolve.",
    suggestions: [
      "Slow dolly-in towards the subject with subtle atmospheric motion",
      "Animate the skyline with rolling clouds and shimmering city lights",
      "Add dynamic lighting shifts and particles swirling around the focal point",
    ],
  },
  reference: {
    label: "Reference to Video",
    tagline: "Guide generation using motion or style references that you already love.",
    accent: "from-violet-500/80 via-indigo-500/70 to-blue-500/80",
    icon: <VideoIcon className="h-5 w-5" />,
    helper:
      "Upload a short clip (under 15s). The AI will mirror motion while reimagining the scene.",
    suggestions: [
      "Match the dance choreography but restyle with cyberpunk neon environments",
      "Reuse this camera orbit but swap the subject for a sculpted glass sculpture",
      "Keep the pacing and lighting but turn the scene into a stylized animation",
    ],
  },
};

const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:5", "2.39:1"];

export default function Home() {
  const [mode, setMode] = useState<GenerationMode>("text");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [duration, setDuration] = useState(6);
  const [guidance, setGuidance] = useState(7);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [referenceVideoFile, setReferenceVideoFile] = useState<File | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const imagePreview = useObjectUrl(imageFile);
  const referencePreview = useObjectUrl(referenceVideoFile);

  const activeMode = MODE_CONFIG[mode];

  const handleFileChange =
    (type: "image" | "reference") => (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        if (type === "image") setImageFile(null);
        if (type === "reference") setReferenceVideoFile(null);
        return;
      }

      if (type === "image" && !file.type.startsWith("image/")) {
        setError("Please upload a valid image file (PNG, JPEG, or WebP).");
        return;
      }

      if (type === "reference" && !file.type.startsWith("video/")) {
        setError("Reference clips must be provided as MP4 or WebM video files.");
        return;
      }

      setError(null);
      if (type === "image") {
        setImageFile(file);
      } else {
        setReferenceVideoFile(file);
      }
    };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode === "image" && !imageFile) {
      setError("Upload an image to drive the animation.");
      return;
    }

    if (mode === "reference" && !referenceVideoFile) {
      setError("Upload a reference motion clip.");
      return;
    }

    startTransition(() => {
      setStatusMessage("Preparing generation pipeline…");
      setError(null);

      const formData = new FormData();
      formData.append("mode", mode);
      formData.append("prompt", prompt);
      formData.append("negativePrompt", negativePrompt);
      formData.append("duration", String(duration));
      formData.append("guidance", String(guidance));
      formData.append("aspectRatio", aspectRatio);

      if (imageFile && mode === "image") {
        formData.append("image", imageFile);
      }

      if (referenceVideoFile && mode === "reference") {
        formData.append("referenceVideo", referenceVideoFile);
      }

      fetch("/api/generate", {
        method: "POST",
        body: formData,
      })
        .then(async (response) => {
          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            throw new Error(payload?.error ?? "Generation failed.");
          }
          return response.json();
        })
        .then((payload: GenerationResult) => {
          setResult(payload);
          setStatusMessage(
            payload.status === "mock"
              ? "Using mock renderer. Supply a provider key to enable live AI generation."
              : "Generation completed successfully.",
          );
        })
        .catch((generationError: unknown) => {
          setError(generationError instanceof Error ? generationError.message : "Unknown error.");
        });
    });
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-10%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute right-[10%] top-[40%] h-[320px] w-[320px] rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute left-[12%] top-[70%] h-[240px] w-[240px] rounded-full bg-lime-400/20 blur-3xl" />
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 pb-24 pt-20 md:px-10 lg:px-16 xl:px-24">
        <header className="flex flex-col gap-6 text-center md:text-left">
          <span className="inline-flex items-center justify-center gap-2 self-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-white/80 md:self-start">
            <Film className="h-4 w-4" />
            FluxForge Studio
          </span>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Generate breathtaking AI videos from text, imagery, or motion cues.
          </h1>
          <p className="text-lg text-slate-300 md:max-w-2xl">
            FluxForge orchestrates top-tier diffusion models with intelligent post-processing so
            your concepts crystallize into cinematic motion in minutes. Prototype sequences, mood
            films, and animated storyboards without leaving the browser.
          </p>
          <div className="flex flex-col gap-4 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>Optimized for Vercel Edge. Bring your own AI provider credential.</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Gauge className="h-4 w-4" />
              <span>Average render time with GPU backends: 45s</span>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
          <div className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <nav className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(MODE_CONFIG) as GenerationMode[]).map((value) => {
                const config = MODE_CONFIG[value];
                const isActive = value === mode;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value)}
                    className={`group relative overflow-hidden rounded-2xl border border-white/10 px-4 py-3 text-left transition-all ${
                      isActive ? "bg-white/[0.08] shadow-lg shadow-black/20" : "bg-white/[0.02]"
                    }`}
                  >
                    <div
                      className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 ${
                        config.accent
                      }`}
                    />
                    <div className="relative flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
                          {config.icon}
                        </span>
                        {config.label}
                      </div>
                      <p className="text-xs text-slate-300">{config.tagline}</p>
                    </div>
                  </button>
                );
              })}
            </nav>

            <div className="rounded-3xl border border-white/5 bg-slate-950/70 p-6 shadow-inner shadow-black/20">
              <div className="space-y-10">
                <div className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-sm text-slate-300">
                  <strong className="text-sm font-semibold text-white">Creative Guidance</strong>
                  <p>{activeMode.helper}</p>
                  <div className="flex flex-wrap gap-2">
                    {activeMode.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setPrompt(suggestion)}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 transition hover:bg-white/10"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                <form className="space-y-8" onSubmit={handleSubmit}>
                  <fieldset className="space-y-3">
                    <label className="text-sm font-medium text-white">Primary prompt</label>
                    <textarea
                      required={mode === "text"}
                      rows={4}
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      placeholder="Describe the motion, cinematic style, lighting, and subject you want to see…"
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                    />
                  </fieldset>

                  <fieldset className="space-y-3">
                    <label className="text-sm font-medium text-white">Negative prompt</label>
                    <input
                      value={negativePrompt}
                      onChange={(event) => setNegativePrompt(event.target.value)}
                      placeholder="Optional: things to avoid (e.g. text artifacts, low fidelity)"
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                    />
                  </fieldset>

                  <fieldset className="grid gap-4 sm:grid-cols-3">
                    <label className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3">
                      <span className="text-xs uppercase tracking-[0.2em] text-white/60">Duration</span>
                      <input
                        type="range"
                        min={3}
                        max={12}
                        value={duration}
                        onChange={(event) => setDuration(Number(event.target.value))}
                        className="w-full accent-white"
                      />
                      <span className="text-lg font-semibold text-white">{duration}s</span>
                    </label>

                    <label className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3">
                      <span className="text-xs uppercase tracking-[0.2em] text-white/60">Guidance</span>
                      <input
                        type="range"
                        min={1}
                        max={15}
                        step={1}
                        value={guidance}
                        onChange={(event) => setGuidance(Number(event.target.value))}
                        className="w-full accent-emerald-400"
                      />
                      <span className="text-lg font-semibold text-white">{guidance}</span>
                    </label>

                    <label className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3">
                      <span className="text-xs uppercase tracking-[0.2em] text-white/60">Aspect</span>
                      <select
                        value={aspectRatio}
                        onChange={(event) => setAspectRatio(event.target.value)}
                        className="mt-auto w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-medium text-white focus:border-white/30 focus:outline-none"
                      >
                        {ASPECT_RATIOS.map((ratio) => (
                          <option key={ratio} value={ratio} className="bg-slate-900 text-white">
                            {ratio}
                          </option>
                        ))}
                      </select>
                    </label>
                  </fieldset>

                  {mode === "image" && (
                    <FileUploadField
                      label="Animate a still frame"
                      description="PNG, JPG, or WebP under 8MB. The AI will generate depth, motion layers, and cinematic camera movement."
                      accept="image/*"
                      file={imageFile}
                      onFileChange={handleFileChange("image")}
                      preview={imagePreview}
                    />
                  )}

                  {mode === "reference" && (
                    <FileUploadField
                      label="Reference motion clip"
                      description="MP4 or WebM under 25MB. Ideal length: 4-12 seconds."
                      accept="video/*"
                      file={referenceVideoFile}
                      onFileChange={handleFileChange("reference")}
                      preview={referencePreview}
                    />
                  )}

                  <div className="flex flex-col gap-3">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-fuchsia-500/20 transition hover:shadow-fuchsia-400/40 disabled:cursor-not-allowed disabled:bg-white/70"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating…
                        </>
                      ) : (
                        <>
                          Launch render
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                    {error && (
                      <span className="text-sm font-medium text-rose-300">
                        {error}
                      </span>
                    )}
                    {statusMessage && !error && (
                      <span className="text-sm text-emerald-300">{statusMessage}</span>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Render output</h2>
              <span className="text-xs uppercase tracking-[0.2em] text-white/60">
                Live Preview
              </span>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/60 shadow-inner shadow-black/40">
              {result?.videoUrl ? (
                <video
                  key={result.videoUrl}
                  src={result.videoUrl}
                  poster={result.posterUrl ?? undefined}
                  controls
                  className="aspect-video w-full"
                  autoPlay
                  loop
                  playsInline
                  muted
                />
              ) : (
                <PlaceholderVideo />
              )}
              <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs font-medium text-white/80">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                {result ? `${MODE_CONFIG[result.mode].label}` : "Ready to render"}
              </div>
            </div>

            {result && (
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">Job ID</span>
                  <code className="rounded bg-black/40 px-2 py-1 text-xs text-white/70">
                    {result.jobId}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">Duration</span>
                  <span>{result.metadata.duration}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">Aspect</span>
                  <span>{result.metadata.aspectRatio}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">Guidance</span>
                  <span>{result.metadata.guidance}</span>
                </div>
                <div>
                  <span className="font-medium text-white">Prompt</span>
                  <p className="mt-1 text-xs leading-relaxed text-white/80">
                    {result.prompt ?? "Prompt unavailable."}
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-white/5 bg-black/60 p-4 text-sm text-slate-300">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                <UploadCloud className="h-4 w-4 text-sky-400" />
                Streaming-friendly outputs
              </h3>
              <p>
                FluxForge delivers H.264 MP4 files with AAC audio and optimized bitrate targeting
                1080p or 4K, ready for creative reviews, motion boards, and social drops. Swap in
                your own GPU-backed provider key to unlock production renders.
              </p>
            </div>
          </aside>
        </section>

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Smart prompt orchestration"
            description="Automatically expands plain-language ideas into multi-pass diffusion prompts tuned for cinematic detail, lighting, and camera behavior."
          />
          <FeatureCard
            title="Adaptive motion engine"
            description="Blends optical flow and depth estimation to synthesize smooth parallax and character animation from still imagery or style references."
          />
          <FeatureCard
            title="Render pipeline ready"
            description="Outputs structured metadata, seed values, and versioned configs so you can re-render or upscale with external GPU providers."
          />
        </section>
      </main>
    </div>
  );
}

function useObjectUrl(file: File | null) {
  const url = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [url]);

  return url;
}

type FileUploadFieldProps = {
  label: string;
  description: string;
  accept: string;
  file: File | null;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  preview: string | null;
};

function FileUploadField({
  label,
  description,
  accept,
  file,
  onFileChange,
  preview,
}: FileUploadFieldProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-white">{label}</legend>
      <label className="flex cursor-pointer flex-col gap-3 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] p-6 text-center transition hover:border-white/40">
        <input type="file" accept={accept} className="hidden" onChange={onFileChange} />
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
          <UploadCloud className="h-6 w-6 text-white/80" />
        </div>
        <span className="text-sm font-semibold text-white">
          {file ? file.name : "Drop file or click to browse"}
        </span>
        <p className="text-xs text-slate-300">{description}</p>
        {preview && (
          <div className="overflow-hidden rounded-xl border border-white/10">
            {accept.startsWith("image") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Preview" className="w-full" />
            ) : (
              <video src={preview} className="w-full" controls muted />
            )}
          </div>
        )}
      </label>
    </fieldset>
  );
}

function PlaceholderVideo() {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-900 via-slate-950 to-black text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
        <Film className="h-6 w-6 text-white/70" />
      </div>
      <p className="text-sm font-medium text-white/80">Render preview will appear here.</p>
      <p className="text-xs text-white/50">Generate a sequence to start playback.</p>
    </div>
  );
}

type FeatureCardProps = {
  title: string;
  description: string;
};

function FeatureCard({ title, description }: FeatureCardProps) {
  return (
    <article className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-sm text-slate-200 shadow-lg shadow-black/10">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
        <Sparkles className="h-5 w-5 text-fuchsia-300" />
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="text-sm text-slate-300">{description}</p>
    </article>
  );
}
