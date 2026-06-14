const PREFIX = "guessrush";

function hostKey(code: string): string {
  return `${PREFIX}:host:${code}`;
}

function playerKey(code: string): string {
  return `${PREFIX}:player:${code}`;
}

const suggestedNameKey = `${PREFIX}:suggestedName`;

export function saveHostToken(code: string, token: string): void {
  window.localStorage.setItem(hostKey(code), token);
}

export function getHostToken(code: string): string | null {
  return window.localStorage.getItem(hostKey(code));
}

export function removeHostToken(code: string): void {
  window.localStorage.removeItem(hostKey(code));
}

export function savePlayerToken(code: string, token: string): void {
  window.localStorage.setItem(playerKey(code), token);
}

export function getPlayerToken(code: string): string | null {
  return window.localStorage.getItem(playerKey(code));
}

export function removePlayerToken(code: string): void {
  window.localStorage.removeItem(playerKey(code));
}

export function saveSuggestedName(name: string): void {
  window.localStorage.setItem(suggestedNameKey, name);
}

export function getSuggestedName(): string {
  return window.localStorage.getItem(suggestedNameKey) ?? "";
}
