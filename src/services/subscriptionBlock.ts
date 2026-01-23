type Listener = () => void;

let listenerExpired: Listener | null = null;
let listenerRestored: Listener | null = null;

let expired = false;

export function setSubscriptionExpiredListener(fn: Listener) {
  listenerExpired = fn;
  if (expired) listenerExpired();
}

export function setSubscriptionRestoredListener(fn: Listener) {
  listenerRestored = fn;
}

export function notifySubscriptionExpired() {
  expired = true;
  if (listenerExpired) listenerExpired();
}

export function notifySubscriptionRestored() {
  expired = false;
  if (listenerRestored) listenerRestored();
}

export function resetSubscriptionExpired() {
  expired = false;
}
