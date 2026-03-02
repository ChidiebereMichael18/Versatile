import React from 'react'
import type { NotificationPayload } from '../../types'

interface Props {
  notification: NotificationPayload | null
}

export function NotificationPanel({ notification }: Props) {
  if (!notification) return null

  return (
    <div className="flex items-center gap-3 w-full h-full px-4 notif-slide no-drag">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
        style={{ background: notification.color || 'rgba(255,255,255,0.1)' }}
      >
        {notification.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white/40 text-[10px] uppercase tracking-wider leading-none">
          {notification.app}
        </p>
        <p className="text-white text-xs font-medium mt-1 leading-tight line-clamp-2">
          {notification.message}
        </p>
      </div>
    </div>
  )
}