import { NextResponse } from "next/server";
import { generatePlan } from "@/lib/providers";

export async function POST(req: Request) {
  const { image, mediaType } = await req.json();

  if (
    typeof image !== "string" ||
    image.length > 4_000_000 ||
    !["image/jpeg", "image/png"].includes(mediaType)
  ) {
    return NextResponse.json({ error: "Invalid image" }, { status: 400 });
  }

  try {
    const result = await generatePlan({ image, mediaType });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Could not build the video. Try again." }, { status: 502 });
  }
}
