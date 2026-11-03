import { cn } from '../../lib/utils'
import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useBackgroundMotion } from '../../lib/useBackgroundMotion'

type DottedSurfaceProps = Omit<React.ComponentProps<'div'>, 'ref'>

export function DottedSurface({ className, ...props }: DottedSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const [motionEnabled] = useBackgroundMotion()

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const SEPARATION = 150
    const AMOUNTX = 40
    const AMOUNTY = 60

    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      10000,
    )
    camera.position.set(0, 355, 1220)

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    } catch {
      // Decorative graphics must never prevent answering the survey on devices without WebGL.
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    // Геометрия
    const positions: number[] = []
    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        positions.push(
          ix * SEPARATION - (AMOUNTX * SEPARATION) / 2,
          0,
          iy * SEPARATION - (AMOUNTY * SEPARATION) / 2,
        )
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

    const material = new THREE.PointsMaterial({
      size: 5,
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)

    let count = 0
    let previousTime = performance.now()

    const animate = (time = performance.now()) => {
      if (motionEnabled && !document.hidden) rafRef.current = requestAnimationFrame(animate)
      // Same wave speed on 60/120/144 Hz displays; no jump after a background tab resumes.
      if (motionEnabled) count += Math.min((time - previousTime) / 1000, 0.05) * 6
      previousTime = time

      const posArr = geometry.attributes.position.array as Float32Array
      let i = 0
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          posArr[i * 3 + 1] =
            Math.sin((ix + count) * 0.3) * 60 +
            Math.sin((iy + count) * 0.5) * 60
          i++
        }
      }
      geometry.attributes.position.needsUpdate = true
      renderer.render(scene, camera)
    }

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
      // Resizing clears the drawing buffer, including when reduced motion has stopped the loop.
      renderer.render(scene, camera)
    }

    window.addEventListener('resize', handleResize)
    const handleVisibility = () => {
      cancelAnimationFrame(rafRef.current)
      previousTime = performance.now()
      if (!document.hidden) animate()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibility)
      cancelAnimationFrame(rafRef.current)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [motionEnabled])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={cn('pointer-events-none', className)}
      {...props}
    />
  )
}
