#!/usr/bin/env python3
"""One-off illustration generator for Build Prompt 12 (Design Brief).

Not part of the app build — run manually to (re)generate the illustration
set into apps/mobile/assets/illustrations/. Requires GEMINI_API_KEY in the
environment (sourced from apps/web/.env.local in this project).
"""
import os
from pathlib import Path
from google import genai
from google.genai import types

OUT_DIR = Path(__file__).parent.parent / "assets" / "illustrations"
OUT_DIR.mkdir(parents=True, exist_ok=True)

STYLE = (
    "Flat, geometric vector illustration style. People-forward: simple, "
    "abstracted human figures (no faces need detail, geometric shapes for "
    "bodies/heads), not photoreal, not stock-photo-like, not a small line "
    "icon. Color palette strictly: deep navy #16233F, warm cream #F6F2EA, "
    "gold/mustard #E8B923, plus one muted accent hue as specified per piece. "
    "Clean, confident shapes, generous negative space, consistent line "
    "weight, editorial and modern, like a premium SaaS product illustration "
    "system commissioned as one set. Transparent or solid cream background. "
    "No text, no logos, no watermarks."
)

PIECES = [
    ("direction-product", "A person at a whiteboard sketching a product roadmap with sticky notes and boxes, product management theme.", "#4A6FA5"),
    ("direction-growth", "A person standing next to a large upward-trending bar chart, growth and metrics theme.", "#3F8F5F"),
    ("direction-ai", "A person interacting with a glowing neural-network / node-graph shape, AI and machine learning theme.", "#7A5AA6"),
    ("direction-building", "A person assembling geometric building blocks or gears into a structure, engineering and building theme.", "#C9702E"),
    ("direction-careers", "A person climbing a simple geometric staircase toward a flag or door, career growth theme.", "#B5473F"),
    ("direction-leadership", "A person standing confidently in front of a small group of abstract figures, leadership and mentorship theme.", "#16233F"),
    ("splash-hero", "A wide horizontal scene: one person standing on a large upward chart line with a laptop and floating UI cards around them, ambitious and optimistic, product-building theme.", "#E8B923"),
    ("welcome-orientation", "A friendly wide scene of two abstract people looking at a large open book or screen together with small floating icons (a chart, a lightbulb, a checklist), onboarding and learning theme.", "#4A6FA5"),
]


def main():
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    for name, subject, accent in PIECES:
        prompt = f"{STYLE} Accent color for this piece: {accent}. Subject: {subject}"
        print(f"Generating {name}...")
        resp = client.models.generate_content(
            model="gemini-3-pro-image-preview",
            contents=prompt,
            config=types.GenerateContentConfig(response_modalities=["Image"]),
        )
        saved = False
        for part in resp.candidates[0].content.parts:
            if part.inline_data:
                out_path = OUT_DIR / f"{name}.png"
                out_path.write_bytes(part.inline_data.data)
                print(f"  saved {out_path}")
                saved = True
        if not saved:
            print(f"  WARNING: no image returned for {name}")


if __name__ == "__main__":
    main()
