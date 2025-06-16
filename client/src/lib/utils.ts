import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "online":
      return "text-green-600 bg-green-50 border-green-200";
    case "warning":
      return "text-orange-600 bg-orange-50 border-orange-200";
    case "critical":
      return "text-red-600 bg-red-50 border-red-200";
    case "offline":
      return "text-gray-600 bg-gray-50 border-gray-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "online":
      return "Online";
    case "warning":
      return "Warning";
    case "critical":
      return "Critical";
    case "offline":
      return "Offline";
    default:
      return "Unknown";
  }
}

export function getBatteryColor(level: number): string {
  if (level >= 60) return "bg-green-500";
  if (level >= 30) return "bg-orange-500";
  return "bg-red-500";
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "text-red-600 bg-red-50 border-red-200";
    case "warning":
      return "text-orange-600 bg-orange-50 border-orange-200";
    case "info":
      return "text-blue-600 bg-blue-50 border-blue-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
}
