#!/bin/bash

set -e

# https://github.com/magnusviri/svg2icns

# Credits: This script combines all 3 of these scripts
#
# http://www.spaziocurvo.com/2015/03/svg-to-icns-script-for-mac-os-x/
# https://gist.github.com/zlbruce/883605a635df8d5964bab11ed75e46ad
# https://gist.github.com/Canorus/1bc13e4b9ced1df79d396141de6178e4

if [ $# -ne 1 ]; then
	echo "Usage:   svg2icns filename.svg [filename2.svg...]"
	exit 100
fi
if [ ! -e "/usr/bin/iconutil" ]; then
	echo "/usr/bin/iconutil required (are you on macOS?)."
	exit 1
fi
if [ ! -e "/usr/bin/sips" ]; then
	echo "/usr/bin/sips required (are you on macOS?)."
	exit 1
fi

qlmanage="/usr/bin/qlmanage"
svg2png="/usr/local/bin/svg2png"
inkscape="/usr/local/bin/inkscape"
convert="/usr/local/bin/convert"

SIZES="
16,16x16
32,16x16@2x
64,32x32@2x
128,128x128
256,128x128@2x
512,256x256@2x
1024,512x512@2x
"

for SVG in "$@"; do
	BASE=$(basename "$SVG" | sed 's/\.[^\.]*$//')
	ICONSET="$BASE.iconset"
	echo "processing: $SVG"
	mkdir -p "$ICONSET"
	# Blah
	if [ -e "$inkscape" ]; then
		$inkscape -w 1024 -h 1024 "$SVG" --export-filename "$ICONSET"/icon_512x512@2x.png
	elif [ -e "$convert" ]; then
		convert -background none -resize '!${SIZE}x${SIZE}' "$SVG" "$ICONSET"/icon_512x512@2x.png
	elif [ -e "$qlmanage" ]; then
		$qlmanage -ti -s 1024 -o "$ICONSET" "$SVG"
		mv "$ICONSET"/$BASE.svg.png "$ICONSET"/icon_512x512@2x.png
	elif [ -e "$svg2png" ]; then
		$svg2png -w 1024 -h 1024 "$SVG" "$ICONSET"/icon_512x512@2x.png
	else
		echo "svg2icns depends on one of the following: qlmanage, svg2png, inkscape, or convert."
		echo "qlmanage comes with macOS (are you on macOS?)."
		echo "You can install the others with homebrew (see http://brew.sh to install that)"
		echo "brew install svg2png"
		echo "brew install inkscape"
		echo "brew install imagemagik"
		exit 1
	fi

	for PARAMS in $SIZES; do
		SIZE=$(echo $PARAMS | cut -d, -f1)
		LABEL=$(echo $PARAMS | cut -d, -f2)
		sips -z $SIZE $SIZE "$ICONSET"/icon_512x512@2x.png --out "$ICONSET"/icon_$LABEL.png
	done
	cp "$ICONSET/icon_16x16@2x.png" "$ICONSET/icon_32x32.png"
	cp "$ICONSET/icon_128x128@2x.png" "$ICONSET/icon_256x256.png"
	cp "$ICONSET/icon_256x256@2x.png" "$ICONSET/icon_512x512.png"
	iconutil -c icns "$ICONSET"
	rm -rf "$ICONSET"
done