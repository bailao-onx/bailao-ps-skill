"""Download a font family and its license from the official google/fonts repository."""

import argparse
import json
import platform
import re
import shutil
import urllib.error
import urllib.request
from pathlib import Path

API = "https://api.github.com/repos/google/fonts/contents"


def read_json(url):
    request = urllib.request.Request(url, headers={"User-Agent": "bailao-ps-skill"})
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)


def download(url, destination):
    if not url or not url.startswith("https://raw.githubusercontent.com/google/fonts/"):
        raise ValueError("Unexpected font download URL")
    request = urllib.request.Request(url, headers={"User-Agent": "bailao-ps-skill"})
    with urllib.request.urlopen(request, timeout=30) as response, destination.open("wb") as output:
        shutil.copyfileobj(response, output)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--family-slug", required=True, help="Google Fonts folder slug, e.g. poppins or notosanssc")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--file-name", help="Download only one exact font file from the family")
    parser.add_argument("--install", action="store_true", help="Install into ~/Library/Fonts on macOS")
    args = parser.parse_args()
    slug = args.family_slug.lower()
    if not re.fullmatch(r"[a-z0-9]+", slug):
        raise ValueError("family slug must contain lowercase letters and digits only")
    family = None
    for license_group in ("ofl", "apache", "ufl"):
        try:
            family = read_json(f"{API}/{license_group}/{slug}")
            break
        except urllib.error.HTTPError as error:
            if error.code != 404:
                raise
    if not isinstance(family, list):
        raise FileNotFoundError(f"No Google Fonts family found for {slug}")
    fonts = [entry for entry in family if entry["name"].lower().endswith((".ttf", ".otf"))]
    if args.file_name:
        fonts = [entry for entry in fonts if entry["name"] == args.file_name]
    licenses = [entry for entry in family if entry["name"].lower() in ("ofl.txt", "license.txt", "ufl.txt")]
    if not fonts or not licenses:
        raise ValueError("Family is missing font files or a license file")
    target = args.output.resolve() / slug
    target.mkdir(parents=True, exist_ok=True)
    downloaded = []
    for entry in licenses + fonts:
        path = target / entry["name"]
        if not path.exists():
            download(entry["download_url"], path)
        downloaded.append(str(path))
    installed = []
    if args.install:
        if platform.system() != "Darwin":
            raise SystemExit("Automatic installation is currently supported on macOS only; downloaded files are ready for manual installation")
        font_dir = Path.home() / "Library/Fonts"
        font_dir.mkdir(parents=True, exist_ok=True)
        for entry in fonts:
            source = target / entry["name"]
            destination = font_dir / entry["name"]
            if destination.exists() and destination.read_bytes() != source.read_bytes():
                raise FileExistsError(f"Different font already installed at {destination}")
            if not destination.exists():
                shutil.copyfile(source, destination)
            installed.append(str(destination))
    print(json.dumps({"family_slug": slug, "downloaded": downloaded, "installed": installed,
                      "license": str(target / licenses[0]["name"]),
                      "note": "Restart or refresh Photoshop fonts if the installed face is not yet in its font menu."},
                     ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
