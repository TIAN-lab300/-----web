function isTypingTarget(target) {
  if (!target) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = typeof target.tagName === "string"
    ? target.tagName.toUpperCase()
    : "";

  return ["INPUT", "TEXTAREA", "SELECT"].includes(tagName);
}

function matchesModifiers(eventLike, shortcut) {
  return (
    Boolean(eventLike.ctrlKey) === Boolean(shortcut.ctrl) &&
    Boolean(eventLike.metaKey) === Boolean(shortcut.meta) &&
    Boolean(eventLike.altKey) === Boolean(shortcut.alt) &&
    Boolean(eventLike.shiftKey) === Boolean(shortcut.shift)
  );
}

export function matchShortcut(eventLike, shortcuts) {
  if (!eventLike || typeof eventLike.key !== "string") {
    return null;
  }

  const typing = isTypingTarget(eventLike.target);
  const key = eventLike.key.toLocaleLowerCase();

  const match = (shortcuts || []).find((shortcut) => {
    if (typing && shortcut.ignoreWhenTyping !== false) {
      return false;
    }

    return (
      shortcut.key.toLocaleLowerCase() === key &&
      matchesModifiers(eventLike, shortcut)
    );
  });

  return match ? match.id : null;
}

