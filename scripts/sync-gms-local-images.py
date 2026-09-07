#!/usr/bin/env python3
"""
sync-gms-local-images.py
Copies web-optimized images from:
  C:\\Users\\dr laptop\\Downloads\\HELIO-MED-products-batches-01-to-09-COMPLETE\\images
into the project repository:
  scripts/gms-images/
"""

import os
import shutil
import argparse

DEFAULT_SRC_DIR = r"C:\Users\dr laptop\Downloads\HELIO-MED-products-batches-01-to-09-COMPLETE\images"
DEFAULT_DST_DIR = os.path.join(os.path.dirname(__file__), "gms-images")

def sync_images(src_dir: str, dst_dir: str, clean: bool = False):
    if not os.path.exists(src_dir):
        raise FileNotFoundError(f"Source images directory not found at: {src_dir}")

    os.makedirs(dst_dir, exist_ok=True)
    folders = [f for f in sorted(os.listdir(src_dir)) if os.path.isdir(os.path.join(src_dir, f))]
    print(f"Syncing {len(folders)} product folders from:\n  {src_dir}\nto:\n  {dst_dir}")

    copied_files = 0
    synced_folders = 0

    for folder in folders:
        src_folder = os.path.join(src_dir, folder)
        dst_folder = os.path.join(dst_dir, folder)

        if clean and os.path.exists(dst_folder):
            shutil.rmtree(dst_folder)

        os.makedirs(dst_folder, exist_ok=True)
        files = [f for f in os.listdir(src_folder) if f.lower().endswith(('.webp', '.jpg', '.jpeg', '.png'))]
        
        for fname in files:
            s_file = os.path.join(src_folder, fname)
            d_file = os.path.join(dst_folder, fname)
            shutil.copy2(s_file, d_file)
            copied_files += 1

        synced_folders += 1

    print(f"\n[DONE] Successfully synced {copied_files} images across {synced_folders} folders into {dst_dir}!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sync GMS product images to local repo.")
    parser.add_argument("--src", default=DEFAULT_SRC_DIR, help="Source images directory")
    parser.add_argument("--dst", default=DEFAULT_DST_DIR, help="Destination images directory in repo")
    parser.add_argument("--clean", action="store_true", help="Remove existing folder contents before copying")
    args = parser.parse_args()
    sync_images(args.src, args.dst, args.clean)
