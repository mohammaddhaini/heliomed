#!/usr/bin/env python3
"""
png_to_webp.py
Converts all PNG images to WebP format in the directory where this script is located.
Supports recursive subdirectories, preserves alpha transparency, and optimizes file size.

Usage:
  - Simply double-click the script, or run:
      python png_to_webp.py
  - Optional flags:
      python png_to_webp.py --quality 90
      python png_to_webp.py --lossless
      python png_to_webp.py --delete-original
      python png_to_webp.py --no-recursive
"""

import os
import sys
import argparse
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("[ERROR] Pillow is not installed.")
    print("Please install it by running: pip install pillow")
    input("\nPress Enter to exit...")
    sys.exit(1)

def format_size(size_bytes: int) -> str:
    """Format bytes to readable KB / MB."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.2f} MB"

def convert_png_to_webp(
    target_dir: str,
    quality: int = 90,
    lossless: bool = False,
    delete_original: bool = False,
    recursive: bool = True,
    overwrite: bool = True
):
    target_path = Path(target_dir).resolve()
    print("=" * 70)
    print(" PNG to WebP Image Converter")
    print("=" * 70)
    print(f" Directory:       {target_path}")
    print(f" Recursive Scan:  {'Yes' if recursive else 'No'}")
    print(f" Mode:            {'Lossless' if lossless else f'Quality: {quality}%'}")
    print(f" Delete PNGs:     {'Yes' if delete_original else 'No (Keep originals)'}")
    print("=" * 70)

    # Gather PNG files
    pattern = "**/*.png" if recursive else "*.png"
    png_files = sorted(list(target_path.glob(pattern)))
    # Also check case-insensitive (.PNG)
    upper_pngs = sorted(list(target_path.glob("**/*.PNG" if recursive else "*.PNG")))
    all_files = sorted(list(set(png_files + upper_pngs)))

    if not all_files:
        print(f"\nNo PNG files found in: {target_path}")
        print("Place this script in a folder containing PNG files and run it again.")
        return

    print(f"\nFound {len(all_files)} PNG file(s) to process.\n")

    converted_count = 0
    skipped_count = 0
    error_count = 0
    total_original_bytes = 0
    total_webp_bytes = 0

    for idx, png_path in enumerate(all_files, start=1):
        rel_path = png_path.relative_to(target_path)
        webp_path = png_path.with_suffix(".webp")

        if webp_path.exists() and not overwrite:
            print(f"[{idx}/{len(all_files)}] SKIP: {rel_path} (WebP already exists)")
            skipped_count += 1
            continue

        try:
            orig_size = png_path.stat().st_size
            total_original_bytes += orig_size

            with Image.open(png_path) as img:
                # Convert modes: WebP supports RGBA and RGB
                if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                    converted_img = img.convert("RGBA")
                else:
                    converted_img = img.convert("RGB")

                save_kwargs = {
                    "format": "WEBP",
                    "method": 6  # Best compression effort
                }
                if lossless:
                    save_kwargs["lossless"] = True
                else:
                    save_kwargs["quality"] = quality

                converted_img.save(webp_path, **save_kwargs)

            new_size = webp_path.stat().st_size
            total_webp_bytes += new_size
            diff = orig_size - new_size
            savings_pct = (diff / orig_size * 100) if orig_size > 0 else 0

            status_note = f"{format_size(orig_size)} -> {format_size(new_size)} ({savings_pct:+.1f}%)"
            print(f"[{idx}/{len(all_files)}] OK: {rel_path} [{status_note}]")
            converted_count += 1

            if delete_original:
                try:
                    png_path.unlink()
                except Exception as del_err:
                    print(f"    Warning: Could not remove original {png_path.name}: {del_err}")

        except Exception as err:
            print(f"[{idx}/{len(all_files)}] ERROR: {rel_path} -> {err}")
            error_count += 1

    # Final Summary
    print("\n" + "=" * 70)
    print(" Conversion Summary")
    print("=" * 70)
    print(f" Converted:       {converted_count} file(s)")
    if skipped_count:
        print(f" Skipped:         {skipped_count} file(s)")
    if error_count:
        print(f" Errors:          {error_count} file(s)")

    if converted_count > 0:
        total_savings = total_original_bytes - total_webp_bytes
        total_pct = (total_savings / total_original_bytes * 100) if total_original_bytes > 0 else 0
        print(f" Original Size:   {format_size(total_original_bytes)}")
        print(f" WebP Size:       {format_size(total_webp_bytes)}")
        print(f" Space Saved:     {format_size(total_savings)} ({total_pct:.1f}% reduction)")
    print("=" * 70)

def main():
    # The default directory is where THIS script file is saved
    script_dir = os.path.dirname(os.path.abspath(__file__))

    parser = argparse.ArgumentParser(
        description="Convert PNG images to WebP format in current directory."
    )
    parser.add_argument(
        "--dir", "-d",
        default=script_dir,
        help=f"Directory to scan (default: directory containing this script: {script_dir})"
    )
    parser.add_argument(
        "--quality", "-q",
        type=int,
        default=90,
        help="WebP quality (0-100, default: 90). Ignored if --lossless is set."
    )
    parser.add_argument(
        "--lossless", "-l",
        action="store_true",
        help="Use lossless WebP compression (ideal for pixel art, icons, text)."
    )
    parser.add_argument(
        "--delete-original",
        action="store_true",
        help="Delete original PNG files after successful conversion."
    )
    parser.add_argument(
        "--no-recursive",
        action="store_true",
        help="Do not scan subdirectories (only scan the immediate folder)."
    )
    parser.add_argument(
        "--no-overwrite",
        action="store_true",
        help="Skip files if a .webp file with the same name already exists."
    )

    args = parser.parse_args()

    convert_png_to_webp(
        target_dir=args.dir,
        quality=args.quality,
        lossless=args.lossless,
        delete_original=args.delete_original,
        recursive=not args.no_recursive,
        overwrite=not args.no_overwrite
    )

    # If run interactively in Windows cmd/explorer (not in a piped process), keep open
    if sys.stdin.isatty():
        input("\nDone! Press Enter to exit...")

if __name__ == "__main__":
    main()
