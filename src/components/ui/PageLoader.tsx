import { motion } from 'framer-motion'

export function PageLoader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex min-h-[60vh] items-center justify-center"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-red-500 dark:border-gray-700 dark:border-t-red-500" />
    </motion.div>
  )
}
