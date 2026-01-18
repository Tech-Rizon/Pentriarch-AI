'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

interface PanelLayout {
  leftPanelSize: number
  centerPanelSize: number
  rightPanelSize: number
  leftPanelCollapsed: boolean
  rightPanelCollapsed: boolean
}

interface PanelLayoutConfig {
  storageKey?: string
  defaultLayout?: Partial<PanelLayout>
}

const DEFAULT_LAYOUT: PanelLayout = {
  leftPanelSize: 25,
  centerPanelSize: 50,
  rightPanelSize: 25,
  leftPanelCollapsed: false,
  rightPanelCollapsed: false
}

export const usePanelLayout = (config: PanelLayoutConfig = {}) => {
  const {
    storageKey = 'pentriarch-panel-layout',
    defaultLayout = {}
  } = config

  // Memoize merged default layout to prevent recreation on every render
  const mergedDefaultLayout = useMemo(() => ({ ...DEFAULT_LAYOUT, ...defaultLayout }), [defaultLayout])

  const [layout, setLayout] = useState<PanelLayout>(mergedDefaultLayout)

  // Track if we're in the initial load phase to prevent save loop
  const isInitialLoadRef = useRef(true)
  const hasLoadedFromStorageRef = useRef(false)

  // Load layout from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsedLayout = JSON.parse(stored) as Partial<PanelLayout>
        hasLoadedFromStorageRef.current = true
        setLayout(prev => ({ ...prev, ...parsedLayout }))
      }
    } catch (error) {
      console.warn('Failed to load panel layout from localStorage:', error)
    } finally {
      // Mark initial load as complete after a brief delay
      setTimeout(() => {
        isInitialLoadRef.current = false
      }, 100)
    }
  }, [storageKey])

  // Save layout to localStorage whenever it changes (but not during initial load)
  useEffect(() => {
    // Skip saving during initial load or if we just loaded from storage
    if (isInitialLoadRef.current) {
      return
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(layout))
    } catch (error) {
      console.warn('Failed to save panel layout to localStorage:', error)
    }
  }, [layout, storageKey])

  // Update panel sizes
  const updatePanelSizes = useCallback((sizes: { left?: number; center?: number; right?: number }) => {
    setLayout(prev => ({
      ...prev,
      leftPanelSize: sizes.left ?? prev.leftPanelSize,
      centerPanelSize: sizes.center ?? prev.centerPanelSize,
      rightPanelSize: sizes.right ?? prev.rightPanelSize
    }))
  }, [])

  // Toggle panel collapsed state
  const togglePanel = useCallback((panel: 'left' | 'right') => {
    setLayout(prev => ({
      ...prev,
      leftPanelCollapsed: panel === 'left' ? !prev.leftPanelCollapsed : prev.leftPanelCollapsed,
      rightPanelCollapsed: panel === 'right' ? !prev.rightPanelCollapsed : prev.rightPanelCollapsed
    }))
  }, [])

  // Collapse/expand specific panel
  const setPanel = useCallback((panel: 'left' | 'right', collapsed: boolean) => {
    setLayout(prev => ({
      ...prev,
      leftPanelCollapsed: panel === 'left' ? collapsed : prev.leftPanelCollapsed,
      rightPanelCollapsed: panel === 'right' ? collapsed : prev.rightPanelCollapsed
    }))
  }, [])

  // Reset to default layout
  const resetLayout = useCallback(() => {
    setLayout(mergedDefaultLayout)
  }, [mergedDefaultLayout])

  // Get current panel sizes accounting for collapsed state
  const getPanelSizes = useCallback(() => {
    const { leftPanelCollapsed, rightPanelCollapsed, leftPanelSize, centerPanelSize, rightPanelSize } = layout

    if (leftPanelCollapsed && rightPanelCollapsed) {
      return {
        leftPanelSize: 0,
        centerPanelSize: 100,
        rightPanelSize: 0
      }
    }

    if (leftPanelCollapsed) {
      const remaining = 100 - rightPanelSize
      return {
        leftPanelSize: 0,
        centerPanelSize: remaining,
        rightPanelSize
      }
    }

    if (rightPanelCollapsed) {
      const remaining = 100 - leftPanelSize
      return {
        leftPanelSize,
        centerPanelSize: remaining,
        rightPanelSize: 0
      }
    }

    return { leftPanelSize, centerPanelSize, rightPanelSize }
  }, [layout])

  return {
    layout,
    updatePanelSizes,
    togglePanel,
    setPanel,
    resetLayout,
    getPanelSizes
  }
}
