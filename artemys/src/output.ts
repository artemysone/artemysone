let jsonMode = false;

export function setJsonMode(enabled: boolean): void {
  jsonMode = enabled;
}


export function output(data: unknown, humanReadable: string): void {
  if (jsonMode) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(humanReadable);
  }
}

export function error(message: string): void {
  console.error(message);
}
