import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

type GenerationMode = "text" | "image" | "reference";

type GenerationPayload = {
  mode: GenerationMode;
  prompt: string;
  negativePrompt?: string;
  duration: number;
  guidance: number;
  aspectRatio: string;
  imageBase64?: string;
  referenceBase64?: string;
  imageMimeType?: string;
  referenceMimeType?: string;
};

const MOCK_VIDEOS: Record<GenerationMode, { videoUrl: string; posterUrl: string }> = {
  text: {
    videoUrl: "https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
  },
  image: {
    videoUrl: "https://storage.googleapis.com/coverr-main/mp4/Night_Sky.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80",
  },
  reference: {
    videoUrl: "https://storage.googleapis.com/coverr-main/mp4/Lighthouse.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
  },
};

const FAL_KEY = process.env.FAL_KEY;
const REPLICATE_KEY = process.env.REPLICATE_API_TOKEN;

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const mode = parseMode(form.get("mode"));
    const prompt = String(form.get("prompt") ?? "").trim();
    const negativePrompt = String(form.get("negativePrompt") ?? "").trim();
    const duration = clampNumber(form.get("duration"), 3, 12, 6);
    const guidance = clampNumber(form.get("guidance"), 1, 15, 7);
    const aspectRatio = validateAspectRatio(String(form.get("aspectRatio") ?? "16:9"));

    if (mode === "text" && !prompt) {
      return NextResponse.json(
        { error: "A descriptive prompt is required for text-to-video generations." },
        { status: 400 },
      );
    }

    const payload: GenerationPayload = {
      mode,
      prompt,
      negativePrompt,
      duration,
      guidance,
      aspectRatio,
    };

    const imageFile = form.get("image");
    const referenceFile = form.get("referenceVideo");

    if (mode === "image") {
      if (!(imageFile instanceof File)) {
        return NextResponse.json(
          { error: "Image-to-video generations require an image upload." },
          { status: 400 },
        );
      }

      const encoded = await encodeFile(imageFile);
      payload.imageBase64 = encoded.base64;
      payload.imageMimeType = encoded.mimeType;
    }

    if (mode === "reference") {
      if (!(referenceFile instanceof File)) {
        return NextResponse.json(
          { error: "Reference-to-video generations require a reference video upload." },
          { status: 400 },
        );
      }

      const encoded = await encodeFile(referenceFile, 25 * 1024 * 1024);
      payload.referenceBase64 = encoded.base64;
      payload.referenceMimeType = encoded.mimeType;
    }

    const jobId = `job_${randomUUID()}`;

    const providerResult =
      FAL_KEY || REPLICATE_KEY ? await tryExternalGeneration(payload, jobId) : null;

    if (providerResult) {
      return NextResponse.json(providerResult);
    }

    const fallback = createMockResponse(payload.mode, jobId, payload);
    return NextResponse.json(fallback);
  } catch (error) {
    console.error("[generate-route]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected error occurred during generation.",
      },
      { status: 500 },
    );
  }
}

function parseMode(value: FormDataEntryValue | null): GenerationMode {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "image" || normalized === "reference" || normalized === "text") {
    return normalized;
  }

  throw new Error("Unsupported generation mode.");
}

function clampNumber(
  value: FormDataEntryValue | null,
  min: number,
  max: number,
  fallback: number,
) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return Math.min(max, Math.max(min, numeric));
  }
  return fallback;
}

function validateAspectRatio(value: string) {
  const pattern = /^\d+(\.\d+)?:\d+(\.\d+)?$/;
  return pattern.test(value) ? value : "16:9";
}

async function encodeFile(file: File, maxSizeBytes = 8 * 1024 * 1024) {
  if (file.size > maxSizeBytes) {
    throw new Error(
      `Uploaded file exceeds the allowed size of ${(maxSizeBytes / (1024 * 1024)).toFixed(1)}MB.`,
    );
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  return {
    base64: `data:${file.type || "application/octet-stream"};base64,${base64}`,
    mimeType: file.type || "application/octet-stream",
  };
}

async function tryExternalGeneration(payload: GenerationPayload, jobId: string) {
  try {
    if (FAL_KEY) {
      const falResponse = await generateWithFal(payload, jobId);
      if (falResponse) return falResponse;
    }

    if (REPLICATE_KEY) {
      const replicateResponse = await generateWithReplicate(payload, jobId);
      if (replicateResponse) return replicateResponse;
    }
  } catch (error) {
    console.error("[generate-route][provider-error]", error);
  }

  return null;
}

async function generateWithFal(payload: GenerationPayload, jobId: string) {
  try {
    const response = await fetch("https://fal.run/fal-ai/flux-pro/video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${FAL_KEY}`,
      },
      body: JSON.stringify({
        prompt: payload.prompt,
        negative_prompt: payload.negativePrompt,
        duration: payload.duration,
        guidance_scale: payload.guidance,
        aspect_ratio: payload.aspectRatio,
        image_url: payload.imageBase64,
        video_url: payload.referenceBase64,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`FAL request failed: ${response.status} ${text}`);
    }

    const data = (await response.json()) as {
      video?: { url: string };
      preview?: string;
    };

    if (!data.video?.url) {
      throw new Error("FAL response did not include a video URL.");
    }

    return {
      jobId,
      videoUrl: data.video.url,
      posterUrl: data.preview ?? null,
      mode: payload.mode,
      prompt: payload.prompt,
      status: "completed" as const,
      metadata: {
        duration: payload.duration,
        aspectRatio: payload.aspectRatio,
        guidance: payload.guidance,
      },
    };
  } catch (error) {
    console.error("[generate-route][fal]", error);
    return null;
  }
}

async function generateWithReplicate(payload: GenerationPayload, jobId: string) {
  try {
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${REPLICATE_KEY}`,
      },
      body: JSON.stringify({
        version: "luma-labs/luma-ray-2", // provide your preferred model identifier
        input: {
          prompt: payload.prompt,
          negative_prompt: payload.negativePrompt,
          duration: payload.duration,
          guidance: payload.guidance,
          aspect_ratio: payload.aspectRatio,
          image: payload.imageBase64,
          reference: payload.referenceBase64,
        },
        wait: true,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Replicate request failed: ${response.status} ${text}`);
    }

    const data = (await response.json()) as Record<string, unknown>;

    const output = data?.output as
      | { video?: string; poster?: string }
      | string[]
      | undefined;

    const videoCandidate =
      typeof output === "object" && !Array.isArray(output)
        ? output.video
        : Array.isArray(output)
          ? output[0]
          : undefined;

    if (typeof videoCandidate !== "string" || !videoCandidate) {
      throw new Error("Replicate response did not include a video URL.");
    }

    return {
      jobId,
      videoUrl: videoCandidate,
      posterUrl:
        (typeof output === "object" &&
          !Array.isArray(output) &&
          typeof output.poster === "string" &&
          output.poster) ||
        payload.imageBase64 ||
        null,
      mode: payload.mode,
      prompt: payload.prompt,
      status: "completed" as const,
      metadata: {
        duration: payload.duration,
        aspectRatio: payload.aspectRatio,
        guidance: payload.guidance,
      },
    };
  } catch (error) {
    console.error("[generate-route][replicate]", error);
    return null;
  }
}

function createMockResponse(
  mode: GenerationMode,
  jobId: string,
  payload: GenerationPayload,
) {
  const mock = MOCK_VIDEOS[mode];

  return {
    jobId,
    videoUrl: mock.videoUrl,
    posterUrl: mock.posterUrl,
    mode,
    prompt: payload.prompt,
    status: "mock" as const,
    metadata: {
      duration: payload.duration,
      aspectRatio: payload.aspectRatio,
      guidance: payload.guidance,
    },
  };
}
