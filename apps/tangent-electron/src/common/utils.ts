export function clamp(value: number, min: number, max: number, step?: number) {
	const clamped = Math.min(Math.max(value, min), max)
	if (step !== undefined) {
		let offset = value - min
		let remainder = offset % step

		if (remainder > step / 2) {
			return clamped + step - remainder
		}
		else {
			return clamped - remainder
		}
	}
	return clamped
}

export function enumKeys<O extends object, K extends keyof O = keyof O>(obj: O): K[] {
    return Object.keys(obj).filter(k => Number.isNaN(+k)) as K[];
}

const emojiExtractor = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])(.*)/

/** Extracts a first-character emoji, if present */
export function extractLeadingEmoji(value: string) {
	const match = value.match(emojiExtractor)
	if (match) {
		return {
			emoji: match[1],
			remainder: match[2]
		}
	}
	return null
}

export function filterInPlace<T>(list: T[], predicate: (item: T) => boolean) {
	let i = 0
	let j = 0
	for (; i < list.length && j < list.length; i++) {
		const item = list[i]
		if (predicate(item)) {
			list[j] = item
			j++
		}
	}

	while (j < list.length) {
		list.pop()
	}
}

// some path api utils

export function pathBasename(filepath: string) {
  if (typeof filepath !== "string") {
    throw new TypeError("Path must be a string");
  }

  // Remove trailing slashes (e.g., '/folder/sub/' -> '/folder/sub')
  const trimmed = filepath.replace(/[\\/]+$/, "");

  // Split by either forward slash or backslash and take the last part
  const base = trimmed.split(/[\\/]/).pop() || "";

  return base;
}

export function pathRelative(from, to) {
  if (typeof from !== "string" || typeof to !== "string") {
    throw new TypeError("Paths must be strings");
  }

  // Helper to normalize slashes and resolve '.' and '..' segments
  const normalizeParts = (p) => {
    const isWindowsDrive = /^[a-zA-Z]:/.test(p);
    const isRoot = p.startsWith("/") || p.startsWith("\\") || isWindowsDrive;
    const rawParts = p.split(/[\\/]+/).filter(Boolean);
    const stack = [];

    for (const part of rawParts) {
      if (part === ".") continue;
      if (part === "..") {
        if (stack.length > 0 && stack[stack.length - 1] !== "..") {
          // Don't pop a Windows drive letter (e.g., 'C:')
          if (!(stack.length === 1 && /^[a-zA-Z]:$/.test(stack[0]))) {
            stack.pop();
          }
        } else if (!isRoot) {
          stack.push("..");
        }
      } else {
        stack.push(part);
      }
    }
    return stack;
  };

  const fromParts = normalizeParts(from);
  const toParts = normalizeParts(to);

  // On Windows, if drive letters differ (e.g., C: vs D:), return the resolved 'to' path
  if (
    fromParts[0] &&
    toParts[0] &&
    /^[a-zA-Z]:$/.test(fromParts[0]) &&
    /^[a-zA-Z]:$/.test(toParts[0]) &&
    fromParts[0].toLowerCase() !== toParts[0].toLowerCase()
  ) {
    return toParts.join("/");
  }

  // Find where the two paths diverge
  let commonLength = 0;
  const minLength = Math.min(fromParts.length, toParts.length);

  while (
    commonLength < minLength &&
    fromParts[commonLength] === toParts[commonLength]
  ) {
    commonLength++;
  }

  // Step up ('..') for each remaining directory in 'from'
  const upSteps = Array(fromParts.length - commonLength).fill("..");
  const downSteps = toParts.slice(commonLength);

  return [...upSteps, ...downSteps].join("/");
}

export function pathDirname(filepath) {
  if (typeof filepath !== "string") {
    throw new TypeError("Path must be a string");
  }

  if (filepath.length === 0) return ".";

  // Match optional Windows drive letter (e.g., 'C:')
  const driveMatch = filepath.match(/^[a-zA-Z]:/);
  const drive = driveMatch ? driveMatch[0] : "";
  let rest = filepath.slice(drive.length);

  // Strip trailing slashes, unless the path is just root ('/' or '\')
  rest = rest.replace(/[\\/]+$/, "");
  if (rest.length === 0) {
    return filepath.length > drive.length ? `${drive}/` : drive || ".";
  }

  // Find the last slash
  const lastSlashIndex = Math.max(
    rest.lastIndexOf("/"),
    rest.lastIndexOf("\\")
  );

  // No slash found (e.g., 'file.txt' or 'C:file.txt')
  if (lastSlashIndex === -1) {
    return drive || ".";
  }

  // Slash is at the root (e.g., '/file.txt' -> '/')
  if (lastSlashIndex === 0) {
    return `${drive}/`;
  }

  // Return everything before the last slash (collapsing trailing slashes on the dir)
  const dir = rest.slice(0, lastSlashIndex).replace(/[\\/]+$/, "");
  return `${drive}${dir || "/"}`;
}

