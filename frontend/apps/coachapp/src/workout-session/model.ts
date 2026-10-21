export const recordingStorageKey = (owner: string, clientId: string, logId: string) =>
  `easy.workout-recording.v1:${owner}:${clientId}:${logId}`;
