function isValidDate(value) {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function getNextOccurrence(rule, fromDate) {
  if (!rule || !isValidDate(fromDate)) {
    return null;
  }

  if (rule.mode === "once") {
    return null;
  }

  if (rule.mode === "daily") {
    const next = new Date(fromDate);
    next.setDate(next.getDate() + 1);
    return next.toISOString();
  }

  if (rule.mode !== "weekly") {
    return null;
  }

  const weekdays = Array.isArray(rule.weekdays)
    ? [...new Set(rule.weekdays)].sort((first, second) => first - second)
    : [];

  if (
    weekdays.length === 0 ||
    weekdays.some((weekday) => !Number.isInteger(weekday) || weekday < 0 || weekday > 6)
  ) {
    return null;
  }

  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = new Date(fromDate);
    candidate.setDate(candidate.getDate() + offset);

    if (weekdays.includes(candidate.getDay())) {
      return candidate.toISOString();
    }
  }

  return null;
}

