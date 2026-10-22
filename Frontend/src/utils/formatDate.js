/**
 * Formats date into readable date and time
 * @param {string|Date} dateInput
 * @returns {string} e.g. "Wed, Oct 21, 2026, 6:00 PM"
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
};

export const formatShortDate = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

export const formatDateOnly = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

export const formatTimeOnly = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
};

/**
 * Checks if the event's close time (endTime) has passed
 * e.g. if close time is 5:00 PM and current time is 5:10 PM, returns true (Over Time).
 */
export const isEventOverTime = (event) => {
  if (!event) return false;
  const now = new Date();
  if (event.endTime) {
    const end = new Date(event.endTime);
    if (!isNaN(end.getTime())) {
      return now > end;
    }
  }
  if (event.startTime) {
    const start = new Date(event.startTime);
    if (!isNaN(start.getTime())) {
      return now > start;
    }
  }
  return false;
};

/**
 * Returns formatted Open Time (startTime) and Close Time (endTime) for an event
 */
export const getEventTimingDisplay = (event) => {
  if (!event) {
    return {
      dateStr: '',
      openTime: '',
      closeTime: '',
      isOverTime: false
    };
  }

  const start = event.startTime ? new Date(event.startTime) : null;
  const end = event.endTime ? new Date(event.endTime) : null;

  const dateStr = start ? formatDateOnly(start) : '';
  const openTime = start ? formatTimeOnly(start) : 'N/A';
  const closeTime = end ? formatTimeOnly(end) : (start ? formatTimeOnly(start) : 'N/A');

  const now = new Date();
  const isOverTime = end && !isNaN(end.getTime())
    ? now > end
    : (start && !isNaN(start.getTime()) ? now > start : false);

  return {
    dateStr,
    openTime,
    closeTime,
    isOverTime
  };
};

// Backward-compatible alias for existing imports
export const getEventScheduleInfo = (event) => {
  const display = getEventTimingDisplay(event);
  return {
    ...display,
    closeDateStr: event?.endTime ? formatDate(event.endTime) : (event?.startTime ? formatDate(event.startTime) : ''),
    isClosed: display.isOverTime
  };
};
