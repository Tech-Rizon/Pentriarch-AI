import { type NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getUserNotifications, markNotificationAsRead, createNotification } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread_only') === 'true'
    const type = searchParams.get('type')
    const limit = Number.parseInt(searchParams.get('limit') || '50')

    const notifications = await getUserNotifications(user.id)

    let filteredNotifications = notifications

    if (unreadOnly) {
      filteredNotifications = notifications.filter(n => !n.read)
    }

    if (type) {
      filteredNotifications = filteredNotifications.filter(n => n.type === type)
    }

    // Limit results
    filteredNotifications = filteredNotifications.slice(0, limit)

    // Count unread notifications
    const unreadCount = notifications.filter(n => !n.read).length

    return NextResponse.json({
      notifications: filteredNotifications,
      unreadCount,
      total: notifications.length,
      hasUnread: unreadCount > 0
    })

  } catch (error) {
    console.error('Notifications GET error:', error)
    return NextResponse.json({
      error: 'Failed to fetch notifications',
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, title, message, scanId, severity, autoMarkRead = false } = await request.json()

    if (!type || !title || !message) {
      return NextResponse.json({
        error: 'Type, title, and message are required'
      }, { status: 400 })
    }

    // Validate notification type
    const validTypes = ['scan_complete', 'vulnerability_found', 'system_alert', 'ai_fallback']
    if (!validTypes.includes(type)) {
      return NextResponse.json({
        error: `Invalid notification type. Must be one of: ${validTypes.join(', ')}`
      }, { status: 400 })
    }

    // Create notification
    const notification = await createNotification({
      user_id: user.id,
      type,
      title,
      message,
      read: autoMarkRead,
      scan_id: scanId || null,
      severity: severity || null
    })

    // Send real-time notification (WebSocket would go here in production)
    // For now, we'll just log it
    console.log('Real-time notification sent:', {
      userId: user.id,
      notification
    })

    return NextResponse.json({
      success: true,
      notification,
      message: 'Notification created successfully'
    })

  } catch (error) {
    console.error('Notifications POST error:', error)
    return NextResponse.json({
      error: 'Failed to create notification',
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { notificationId, action } = await request.json()

    if (!notificationId || !action) {
      return NextResponse.json({
        error: 'Notification ID and action are required'
      }, { status: 400 })
    }

    switch (action) {
      case 'mark_read': {
        const updatedNotification = await markNotificationAsRead(notificationId)
        return NextResponse.json({
          success: true,
          notification: updatedNotification,
          message: 'Notification marked as read'
        })
      }

      case 'mark_all_read': {
        // Mark all user notifications as read
        const { supabase } = await import('@/lib/supabase')
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', user.id)
          .eq('read', false)

        if (error) {
          throw error
        }

        return NextResponse.json({
          success: true,
          message: 'All notifications marked as read'
        })
      }

      case 'delete': {
        const { supabase: supabaseDelete } = await import('@/lib/supabase')
        const { error: deleteError } = await supabaseDelete
          .from('notifications')
          .delete()
          .eq('id', notificationId)
          .eq('user_id', user.id) // Ensure user owns the notification

        if (deleteError) {
          throw deleteError
        }

        return NextResponse.json({
          success: true,
          message: 'Notification deleted'
        })
      }

      default:
        return NextResponse.json({
          error: 'Invalid action. Supported: mark_read, mark_all_read, delete'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Notifications PATCH error:', error)
    return NextResponse.json({
      error: 'Failed to update notification',
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// Bulk operations
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const olderThan = searchParams.get('older_than') // ISO date string

    const { supabase } = await import('@/lib/supabase')

    if (action === 'clear_all') {
      // Delete all notifications for user
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        message: 'All notifications cleared'
      })
    }

    if (action === 'clear_read') {
      // Delete only read notifications
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('read', true)

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        message: 'Read notifications cleared'
      })
    }

    if (action === 'clear_old' && olderThan) {
      // Delete notifications older than specified date
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .lt('created_at', olderThan)

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        message: `Notifications older than ${olderThan} cleared`
      })
    }

    return NextResponse.json({
      error: 'Invalid action. Supported: clear_all, clear_read, clear_old'
    }, { status: 400 })

  } catch (error) {
    console.error('Notifications DELETE error:', error)
    return NextResponse.json({
      error: 'Failed to clear notifications',
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
