import { motion, easeOut } from 'framer-motion'
import { SpiralAnimation } from '../ui/SpiralAnimation'

export function SuccessScreen({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      key="done"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="success-spiral-wrap"
    >
      {/* Spiral background */}
      <div className="success-spiral-bg">
        <SpiralAnimation />
      </div>

      {/* Overlay content */}
      <div className="success-spiral-content">
        <motion.div
          className="success-card"
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut }}
        >
          {/* Glow behind checkmark */}
          <div className="success-card__glow" />

          {/* Checkmark */}
          <motion.div
            className="success-card__icon"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.1, type: 'spring', stiffness: 280, damping: 22 }}
          >
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <motion.circle
                cx="32" cy="32" r="28"
                stroke="#22c55e" strokeWidth="1.5" fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.15, ease: easeOut }}
              />
              <motion.path
                d="M20 32l9 9 15-16"
                stroke="#22c55e" strokeWidth="2.5" fill="none"
                strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.35, delay: 0.5, ease: easeOut }}
              />
            </svg>
          </motion.div>

          {/* Divider */}
          <motion.div
            className="success-card__divider"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3, ease: easeOut }}
          />

          {/* Text */}
          <motion.div
            className="success-card__body"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25, ease: easeOut }}
          >
            <h2 className="success-card__title">Заявка отправлена</h2>
            <p className="success-card__sub">
              Наш специалист свяжется с вами<br />в ближайшее время
            </p>
          </motion.div>

          {/* Button */}
          <motion.button
            className="success-card__btn"
            onClick={onReset}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.45, ease: easeOut }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            Отправить ещё одну заявку
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  )
}
