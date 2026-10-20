export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

export function formatETA(seconds: number): string {
  if (seconds < 0 || !isFinite(seconds)) return 'Unknown';
  if (seconds === 0) return 'Complete';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'downloading':
      return 'text-blue-600 dark:text-blue-400';
    case 'extracting':
      return 'text-purple-600 dark:text-purple-400';
    case 'paused':
    case 'stopped':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'completed':
      return 'text-green-600 dark:text-green-400';
    case 'error':
      return 'text-red-600 dark:text-red-400';
    case 'queued':
      return 'text-gray-600 dark:text-gray-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

export function getStatusText(status: string): string {
  if (status === 'stopped') return 'Paused';
  if (status === 'actionRequired') return 'Action required';
  return status.charAt(0).toUpperCase() + status.slice(1);
}
