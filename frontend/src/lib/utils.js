import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Format date to Vietnamese locale
 * Example: "Thứ Sáu, 15/06/2026"
 */
export function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  const dayOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][d.getDay()]
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${dayOfWeek}, ${day}/${month}/${year}`
}

/**
 * Format price to Vietnamese currency (VND)
 * Example: 150000 -> "150.000 đ"
 */
export function formatPrice(price) {
  if (price === null || price === undefined) return 'Liên hệ'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}
